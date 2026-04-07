import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

type UserRow = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

let currentUserRow: UserRow = {};
const dbWrites: Array<{ sql: string; args?: unknown[] }> = [];

const mockDbExecute = mock(async ({ sql, args }: { sql: string; args?: unknown[] }) => {
  if (sql.includes("SELECT stripe_customer_id, stripe_subscription_id FROM users WHERE id = ?")) {
    return {
      rows: [
        {
          stripe_customer_id: currentUserRow.stripe_customer_id ?? null,
          stripe_subscription_id: currentUserRow.stripe_subscription_id ?? null,
        },
      ],
    };
  }

  if (sql.includes("UPDATE users") && sql.includes("SET stripe_customer_id = ?")) {
    dbWrites.push({ sql, args });
    return { rows: [] };
  }

  return { rows: [] };
});

const mockCreatePortalSession = mock(async () => ({ url: "https://billing.stripe.test/session" }));
const mockRetrieveSubscription = mock(async () => ({ customer: "cus_from_subscription" }));
const mockListCustomers = mock(async () => ({ data: [] as Array<{ id: string; deleted?: boolean }> }));
const mockListSubscriptions = mock(async () => ({ data: [] as Array<{ status: string }> }));
let mockCanManageBilling = true;

mock.module("@/lib/auth", () => ({
  getAuthUser: async () => ({
    userId: "user_123",
    email: "user@example.com",
    tier: "pro" as const,
    isPro: true,
  }),
  requireAuth: async () => ({
    userId: "user_123",
    email: "user@example.com",
    tier: "pro" as const,
    isPro: true,
  }),
  requirePro: async () => ({
    userId: "user_123",
    email: "user@example.com",
    tier: "pro" as const,
    isPro: true,
  }),
  authErrorResponse: (error: unknown) => {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: String(error) }), { status: 401 });
  },
}));

mock.module("@/lib/runtime-mode", () => ({
  getProGate: () => ({
    productEnabled: false,
    billingEnabled: true,
    surfacesEnabled: false,
    waitlistEnabled: true,
    configuredLimitMode: "shadow" as const,
    forceEnforce: false,
    waitlistEnforceThreshold: 125,
  }),
  isProFeatureEnabled: (feature: string) => feature === "billing",
  getProBillingEnabled: () => true,
  getProSurfacesEnabled: () => false,
  getWaitlistEnabled: () => true,
  getConfiguredLimitMode: () => "shadow",
  getForceEnforce: () => false,
  getWaitlistEnforceThreshold: () => 125,
  isClerkServerConfigured: () => true,
  isClerkClientConfigured: () => true,
  getInternalAdminIds: () => [],
  getProRolloutAdminIds: () => [],
}));

mock.module("@/lib/pro-access", () => ({
  resolveProAccess: () => ({
    canManageBilling: mockCanManageBilling,
  }),
  getFeatureDisabledResponse: (feature: string) =>
    new Response(JSON.stringify({ error: "feature_disabled", feature }), { status: 403 }),
}));

mock.module("@/lib/user-db", () => ({
  requireUserDb: () => ({
    execute: (...args: Parameters<typeof mockDbExecute>) => mockDbExecute(...args),
  }),
  getUserDb: () => ({
    execute: (...args: Parameters<typeof mockDbExecute>) => mockDbExecute(...args),
  }),
}));

mock.module("@/lib/stripe", () => ({
  APP_URL: "http://localhost:3000",
  requireStripe: () => ({
    billingPortal: {
      sessions: {
        create: (...args: Parameters<typeof mockCreatePortalSession>) =>
          mockCreatePortalSession(...args),
      },
    },
    subscriptions: {
      retrieve: (...args: Parameters<typeof mockRetrieveSubscription>) =>
        mockRetrieveSubscription(...args),
      list: (...args: Parameters<typeof mockListSubscriptions>) =>
        mockListSubscriptions(...args),
    },
    customers: {
      list: (...args: Parameters<typeof mockListCustomers>) => mockListCustomers(...args),
    },
  }),
}));

const { POST } = await import("@/app/api/stripe/portal/route");

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  mockCanManageBilling = true;
  currentUserRow = {};
  dbWrites.length = 0;

  mockDbExecute.mockClear();
  mockCreatePortalSession.mockClear();
  mockRetrieveSubscription.mockClear();
  mockListCustomers.mockClear();
  mockListSubscriptions.mockClear();

  mockRetrieveSubscription.mockImplementation(async () => ({
    customer: "cus_from_subscription",
  }));
  mockListCustomers.mockImplementation(async () => ({ data: [] }));
  mockListSubscriptions.mockImplementation(async () => ({ data: [] }));
});

describe("POST /api/stripe/portal", () => {
  it("uses stripe_customer_id from database when present", async () => {
    currentUserRow = {
      stripe_customer_id: "cus_from_db",
      stripe_subscription_id: "sub_from_db",
    };

    const response = await POST();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://billing.stripe.test/session");
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: "cus_from_db",
      return_url: "http://localhost:3000/settings/billing",
    });
    expect(mockRetrieveSubscription).not.toHaveBeenCalled();
  });

  it("falls back to stripe_subscription_id when customer id is missing", async () => {
    currentUserRow = {
      stripe_customer_id: null,
      stripe_subscription_id: "sub_from_db",
    };

    const response = await POST();
    expect(response.status).toBe(200);
    expect(mockRetrieveSubscription).toHaveBeenCalledWith("sub_from_db");
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: "cus_from_subscription",
      return_url: "http://localhost:3000/settings/billing",
    });
    expect(dbWrites.length).toBe(1);
  });

  it("falls back to email customer lookup when database linkage is missing", async () => {
    currentUserRow = {
      stripe_customer_id: null,
      stripe_subscription_id: null,
    };

    mockListCustomers.mockImplementation(async () => ({
      data: [{ id: "cus_a" }, { id: "cus_b" }],
    }));
    mockListSubscriptions.mockImplementation(async ({ customer }: { customer: string }) => {
      if (customer === "cus_a") {
        return { data: [{ status: "canceled" }] };
      }
      return { data: [{ status: "active" }] };
    });

    const response = await POST();
    expect(response.status).toBe(200);
    expect(mockListCustomers).toHaveBeenCalledWith({
      email: "user@example.com",
      limit: 5,
    });
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: "cus_b",
      return_url: "http://localhost:3000/settings/billing",
    });
    expect(dbWrites.length).toBe(1);
  });

  it("returns 400 when no linked or recoverable Stripe subscription exists", async () => {
    currentUserRow = {
      stripe_customer_id: null,
      stripe_subscription_id: null,
    };

    const response = await POST();
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No subscription found");
    expect(mockCreatePortalSession).not.toHaveBeenCalled();
  });

  it("returns 403 when billing access is disabled", async () => {
    mockCanManageBilling = false;

    const response = await POST();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.feature).toBe("billing");
    expect(mockCreatePortalSession).not.toHaveBeenCalled();
  });
});
