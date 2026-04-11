import { describe, expect, it } from "bun:test";
import { requireSameOrigin } from "@/lib/request-origin";

describe("requireSameOrigin", () => {
  it("allows requests with a matching Origin header", () => {
    const request = new Request("https://cosmicindex.dev/api/user/saved-objects", {
      method: "POST",
      headers: {
        Origin: "https://cosmicindex.dev",
      },
    });

    expect(requireSameOrigin(request)).toBeNull();
  });

  it("allows requests when a reverse proxy rewrites request.url", () => {
    const request = new Request("http://fly-local.internal/api/user/saved-objects", {
      method: "POST",
      headers: {
        Origin: "https://cosmicindex.dev",
        Host: "cosmicindex.dev",
      },
    });

    expect(requireSameOrigin(request)).toBeNull();
  });

  it("blocks spoofed forwarded headers when proxy trust is disabled", async () => {
    const request = new Request("http://fly-local.internal/api/user/saved-objects", {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        Host: "cosmicindex.dev",
        "X-Forwarded-Host": "evil.example",
        "X-Forwarded-Proto": "https",
        Forwarded: 'for=203.0.113.10;host="evil.example";proto=https',
      },
    });

    const response = requireSameOrigin(request);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      code: "INVALID_ORIGIN",
    });
  });

  it("allows trusted forwarded headers when explicitly enabled", () => {
    const previous = process.env.TRUST_PROXY_HEADERS;
    process.env.TRUST_PROXY_HEADERS = "true";

    try {
      const request = new Request("http://fly-local.internal/api/user/saved-objects", {
        method: "POST",
        headers: {
          Origin: "https://cosmicindex.dev",
          Host: "fly-local.internal",
          "X-Forwarded-Host": "cosmicindex.dev",
          "X-Forwarded-Proto": "https",
        },
      });

      expect(requireSameOrigin(request)).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.TRUST_PROXY_HEADERS;
      } else {
        process.env.TRUST_PROXY_HEADERS = previous;
      }
    }
  });

  it("allows requests with a matching Referer origin when Origin is absent", () => {
    const request = new Request("https://cosmicindex.dev/api/user/saved-objects", {
      method: "POST",
      headers: {
        Referer: "https://cosmicindex.dev/settings/collections",
      },
    });

    expect(requireSameOrigin(request)).toBeNull();
  });

  it("blocks requests with a mismatched Origin header", async () => {
    const request = new Request("https://cosmicindex.dev/api/user/saved-objects", {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
      },
    });

    const response = requireSameOrigin(request);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      code: "INVALID_ORIGIN",
    });
  });

  it("blocks requests when both Origin and Referer are missing", async () => {
    const request = new Request("https://cosmicindex.dev/api/user/saved-objects", {
      method: "POST",
    });

    const response = requireSameOrigin(request);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      code: "INVALID_ORIGIN",
    });
  });
});
