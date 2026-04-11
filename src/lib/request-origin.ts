import { BASE_URL } from "@/lib/config";

const CONFIGURED_ORIGIN = extractOrigin(BASE_URL) ?? "https://cosmicindex.dev";

function forbiddenOriginResponse(): Response {
  return Response.json(
    {
      error: "Cross-site request blocked.",
      code: "INVALID_ORIGIN",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

function extractOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function extractFirstValue(value: string | null): string | null {
  const firstValue = value?.split(",")[0]?.trim();
  if (!firstValue) return null;
  return firstValue.replace(/^"|"$/g, "");
}

function extractForwardedParam(value: string | null, param: "host" | "proto"): string | null {
  if (!value) return null;

  const firstEntry = value.split(",")[0] ?? "";
  const match = firstEntry.match(new RegExp(`${param}=("[^"]+"|[^;\\s,]+)`, "i"));
  if (!match) return null;

  return match[1]?.replace(/^"|"$/g, "") ?? null;
}

function normalizeProto(value: string | null): "http" | "https" | null {
  const proto = value?.trim().toLowerCase();
  if (proto === "http" || proto === "https") {
    return proto;
  }

  return null;
}

function trustProxyHeaders(): boolean {
  return process.env.TRUST_PROXY_HEADERS === "true";
}

function buildOrigin(host: string | null, proto: "http" | "https" | null): string | null {
  if (!host || !proto) return null;

  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

function getExpectedOrigins(request: Request, observedOrigin: string): Set<string> {
  const trustedForwardedHeader = trustProxyHeaders() ? request.headers.get("forwarded") : null;
  const observedProto = normalizeProto(new URL(observedOrigin).protocol.replace(/:$/, ""));
  const publicProto =
    (trustProxyHeaders()
      ? normalizeProto(extractFirstValue(request.headers.get("x-forwarded-proto")))
      : null) ??
    normalizeProto(extractForwardedParam(trustedForwardedHeader, "proto")) ??
    observedProto;

  const origins = new Set<string>([CONFIGURED_ORIGIN]);
  const hostCandidates = [
    trustProxyHeaders() ? extractFirstValue(request.headers.get("x-forwarded-host")) : null,
    extractForwardedParam(trustedForwardedHeader, "host"),
    extractFirstValue(request.headers.get("host")),
  ];

  for (const host of hostCandidates) {
    const origin = buildOrigin(host, publicProto);
    if (origin) {
      origins.add(origin);
    }
  }

  return origins;
}

export function requireSameOrigin(request: Request): Response | null {
  const originHeader = extractOrigin(request.headers.get("origin"));
  const observedOrigin = originHeader ?? extractOrigin(request.headers.get("referer"));

  if (!observedOrigin) {
    return forbiddenOriginResponse();
  }

  const expectedOrigins = getExpectedOrigins(request, observedOrigin);

  if (originHeader) {
    return expectedOrigins.has(originHeader) ? null : forbiddenOriginResponse();
  }

  const refererOrigin = observedOrigin;
  if (refererOrigin) {
    return expectedOrigins.has(refererOrigin) ? null : forbiddenOriginResponse();
  }

  return forbiddenOriginResponse();
}
