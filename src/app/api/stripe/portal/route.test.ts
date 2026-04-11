import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { BASE_URL } from "@/lib/config";

type UserRow = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

let currentUserRow: UserRow = {};
let currentStripeSubscriptions: Array<{
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  current_period_end?: string | null;
}> = [];
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

  if (sql.includes("SELECT stripe_subscription_id, stripe_customer_id, status, current_period_end")) {
    return {
      rows: currentStripeSubscriptions,
    };
  }

  if (sql.includes("UPDATE users") && sql.includes("SET stripe_customer_id = ?")) {
    dbWrites.push({ sql, args });
    return { rows: [] };
  }

  return { rows: [] };
});

const mockCreatePortalSession = mock(async () => ({ url: "https://billing.stripe.test/session" }));
const mockRetrieveSubscription = mock(async () => ({
  customer: "cus_from_subscription",
  status: "active",
  items: {
    data: [{ price: { id: "price_live_pro", product: "prod_live_pro" } }],
  },
}));
let mockCanManageBilling = true;
const ORIGINAL_STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const SAME_ORIGIN = new URL(BASE_URL).origin;

function createSameOriginRequest(url: string): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      Origin: SAME_ORIGIN,
    },
  });
}

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
    },
  }),
}));

const { POST } = await import("@/app/api/stripe/portal/route");

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  process.env.STRIPE_PRO_PRICE_ID = "price_live_pro";
  mockCanManageBilling = true;
  currentUserRow = {};
  currentStripeSubscriptions = [];
  dbWrites.length = 0;

  mockDbExecute.mockClear();
  mockCreatePortalSession.mockClear();
  mockRetrieveSubscription.mockClear();

  mockRetrieveSubscription.mockImplementation(async () => ({
    customer: "cus_from_subscription",
    status: "active",
    items: {
      data: [{ price: { id: "price_live_pro", product: "prod_live_pro" } }],
    },
  }));
});

afterAll(() => {
  if (ORIGINAL_STRIPE_PRO_PRICE_ID === undefined) {
    delete process.env.STRIPE_PRO_PRICE_ID;
  } else {
    process.env.STRIPE_PRO_PRICE_ID = ORIGINAL_STRIPE_PRO_PRICE_ID;
  }
});

describe("POST /api/stripe/portal", () => {
  it("uses a verified local Pro subscription when present", async () => {
    currentUserRow = {
      stripe_customer_id: "cus_from_local",
      stripe_subscription_id: "sub_from_db",
    };
    currentStripeSubscriptions = [
      {
        stripe_subscription_id: "sub_from_db",
        stripe_customer_id: "cus_from_local",
        status: "active",
        current_period_end: "2026-05-01T00:00:00.000Z",
      },
    ];

    const response = await POST(createSameOriginRequest("http://localhost/api/stripe/portal"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://billing.stripe.test/session");
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: "cus_from_local",
      return_url: "http://localhost:3000/settings/billing",
    });
    expect(mockRetrieveSubscription).not.toHaveBeenCalled();
  });

  it("falls back to stripe_subscription_id when customer id is missing", async () => {
    currentUserRow = {
      stripe_customer_id: null,
      stripe_subscription_id: "sub_from_db",
    };

    const response = await POST(createSameOriginRequest("http://localhost/api/stripe/portal"));
    expect(response.status).toBe(200);
    expect(mockRetrieveSubscription).toHaveBeenCalledWith("sub_from_db");
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: "cus_from_subscription",
      return_url: "http://localhost:3000/settings/billing",
    });
    expect(dbWrites.length).toBe(1);
  });

  it("returns 400 when no verified Pro subscription exists", async () => {
    currentUserRow = {
      stripe_customer_id: null,
      stripe_subscription_id: "sub_from_db",
    };

    mockRetrieveSubscription.mockImplementation(async () => ({
      customer: "cus_wrong_plan",
      status: "active",
      items: {
        data: [{ price: { id: "price_other", product: "prod_other" } }],
      },
    }));

    const response = await POST(createSameOriginRequest("http://localhost/api/stripe/portal"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No subscription found");
    expect(mockCreatePortalSession).not.toHaveBeenCalled();
  });

  it("returns 403 when billing access is disabled", async () => {
    mockCanManageBilling = false;

    const response = await POST(createSameOriginRequest("http://localhost/api/stripe/portal"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.feature).toBe("billing");
    expect(mockCreatePortalSession).not.toHaveBeenCalled();
  });
});
