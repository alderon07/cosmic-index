import {
  SmallBodyData,
  SmallBodyQueryParams,
  PaginatedResponse,
  SmallBodyKind,
  createSlug,
  decodeSlug,
  formatNumber,
  KeyFact,
  ORBIT_CLASSES,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS, hashParams } from "./cache";

const QUERY_API_URL = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";
const LOOKUP_API_URL = "https://ssd-api.jpl.nasa.gov/sbdb.api";

// Timeout for external API calls
// Search queries with regex can be slow (20+ seconds), so we use a longer timeout
const API_TIMEOUT_MS = 30 * 1000; // 30 seconds for search
const LOOKUP_TIMEOUT_MS = 10 * 1000; // 10 seconds for lookup

// Structured logging for API requests (no PII/URL leaks)
interface ApiRequestLog {
  endpoint: "sbdb_query" | "sbdb_lookup";
  method: "GET";
  paramsSet: {
    query: boolean;
    kind: boolean;
    neo: boolean;
    pha: boolean;
  };
  queryLength: number;
  status: number;
  contentType: string | null;
  latencyMs: number;
  responseSnippet?: string;
  requestId?: string;
}

// Redact sensitive patterns from response snippets
function redactSensitive(text: string): string {
  return text
    .replace(/[a-zA-Z0-9_-]{20,}/g, "[REDACTED]") // Long tokens
    .replace(/key[=:][^\s&]+/gi, "key=[REDACTED]")
    .substring(0, 300);
}

// Log API request details (only in dev or with DEBUG_API)
function logApiRequest(log: ApiRequestLog): void {
  if (process.env.NODE_ENV === "development" || process.env.DEBUG_API) {
    console.error("[SBDB]", JSON.stringify(log, null, 2));
  }
}

// Check if error is a contract mismatch (400/422 from API)
export function isContractMismatch(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("400") ||
      error.message.includes("422") ||
      error.message.includes("Invalid") ||
      error.message.includes("parse")
    );
  }
  return false;
}

// Check if error is a timeout or upstream failure
export function isUpstreamFailure(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("timed out") ||
      error.message.includes("500") ||
      error.message.includes("502") ||
      error.message.includes("503") ||
      error.message.includes("504")
    );
  }
  return false;
}

// JPL SBDB Query API response structure
interface SBDBQueryResponse {
  signature: { source: string; version: string };
  count: string;
  fields: string[];
  data: (string | null)[][];
}

// JPL SBDB Lookup API response structure
interface SBDBLookupResponse {
  signature: { source: string; version: string };
  object: {
    spkid: string;
    fullname: string;
    shortname?: string;
    kind: string;
    des: string;
    name: string | null;
    prefix: string | null;
    neo: boolean;
    pha: boolean;
    orbit_class: {
      code: string;
      name: string;
    };
  };
  phys_par?: Array<{
    name: string;
    value: string;
    sigma?: string;
    units?: string;
    desc?: string;
  }>;
  discovery?: {
    date?: string;
    location?: string;
    who?: string;
  };
}

// Response for lookup API with multiple matches (300 status)
interface SBDBLookupListResponse {
  signature: { source: string; version: string };
  list: Array<{ name: string; pdes: string }>;
  message: string;
  count: number;
  code: string;
}

// Sanitize and validate query string
function sanitizeQuery(query: string | undefined): string | undefined {
  if (!query) return undefined;
  
  // Trim whitespace
  const trimmed = query.trim();
  
  // Limit length to prevent abuse (max 100 characters)
  if (trimmed.length > 100) {
    return trimmed.substring(0, 100);
  }
  
  // Remove potentially dangerous characters while allowing normal search terms
  // Allow letters, numbers, spaces, hyphens, and common astronomical notation
  const sanitized = trimmed.replace(/[<>\"'&]/g, "");
  
  return sanitized || undefined;
}

// Build query URL for browsing small bodies
function buildQueryUrl(params: SmallBodyQueryParams): string {
  const url = new URL(QUERY_API_URL);

  // Required fields for our data model
  url.searchParams.set("fields", "spkid,full_name,kind,pdes,name,neo,pha,class,diameter,H");

  // Filter by body kind
  if (params.kind === "asteroid") {
    url.searchParams.set("sb-kind", "a");
  } else if (params.kind === "comet") {
    url.searchParams.set("sb-kind", "c");
  }

  // Filter by NEO status
  if (params.neo === true) {
    url.searchParams.set("sb-group", "neo");
  }

  // Filter by PHA status
  if (params.pha === true) {
    url.searchParams.set("sb-group", "pha");
  }

  // Search query - sanitize input and use custom field constraints
  const sanitizedQuery = sanitizeQuery(params.query);
  if (sanitizedQuery) {
    // Use sb-cdata with regular expression on name, full_name, and pdes fields
    // Escape special regex characters in the query to make it safe
    const escapedQuery = sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const constraint = JSON.stringify({
      OR: [
        `name|RE|.*${escapedQuery}.*`,
        `full_name|RE|.*${escapedQuery}.*`,
        `pdes|RE|.*${escapedQuery}.*`
      ]
    });
    url.searchParams.set("sb-cdata", constraint);
  }

  // Pagination - validate limits
  const limit = Math.min(Math.max(1, params.limit || 20), 100); // Clamp between 1 and 100
  const page = Math.max(1, params.page || 1); // Ensure page is at least 1
  const offset = (page - 1) * limit;
  url.searchParams.set("limit", limit.toString());
  if (offset > 0) {
    url.searchParams.set("limit-from", offset.toString());
  }

  return url.toString();
}

// Parse body kind from JPL data
function parseBodyKind(kind: string | null | undefined): SmallBodyKind {
  if (!kind) return "asteroid";
  const normalized = kind.toLowerCase();
  if (normalized.includes("comet") || normalized === "c") {
    return "comet";
  }
  return "asteroid";
}

// Get orbit class name
function getOrbitClassName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  return ORBIT_CLASSES[code as keyof typeof ORBIT_CLASSES] || code;
}

// Extract display name from full name
function extractDisplayName(fullName: string | null, pdes: string | null, name: string | null): string {
  // Prefer the actual name if available
  if (name && name.trim()) {
    return name.trim();
  }

  // Fall back to cleaned up full name
  if (fullName) {
    // Remove parentheses and extra info
    const cleaned = fullName.replace(/^\d+\s+/, "").replace(/\([^)]*\)/g, "").trim();
    if (cleaned) return cleaned;
  }

  // Fall back to designation
  return pdes || "Unknown";
}

// Transform raw query data to SmallBodyData
function transformFromQuery(
  row: (string | null)[],
  fields: string[]
): SmallBodyData | null {
  const getValue = (field: string): string | null => {
    const idx = fields.indexOf(field);
    return idx >= 0 ? row[idx] : null;
  };

  const fullName = getValue("full_name");
  const pdes = getValue("pdes");
  const name = getValue("name");
  const displayName = extractDisplayName(fullName, pdes, name);

  if (!displayName || displayName === "Unknown") {
    return null;
  }

  const kind = parseBodyKind(getValue("kind"));
  const orbitClass = getValue("class") || "";
  const isNeo = getValue("neo") === "Y";
  const isPha = getValue("pha") === "Y";

  const diameterStr = getValue("diameter");
  const diameter = diameterStr ? parseFloat(diameterStr) : undefined;

  const hStr = getValue("H");
  const absoluteMagnitude = hStr ? parseFloat(hStr) : undefined;

  const keyFacts: KeyFact[] = [];

  keyFacts.push({ label: "Type", value: kind === "comet" ? "Comet" : "Asteroid" });
  keyFacts.push({ label: "Orbit Class", value: getOrbitClassName(orbitClass) });

  if (diameter !== undefined && !isNaN(diameter)) {
    keyFacts.push({ label: "Diameter", value: formatNumber(diameter, 2), unit: "km" });
  }

  if (absoluteMagnitude !== undefined && !isNaN(absoluteMagnitude)) {
    keyFacts.push({ label: "Absolute Magnitude", value: formatNumber(absoluteMagnitude, 1), unit: "H" });
  }

  if (isNeo) {
    keyFacts.push({ label: "Near-Earth Object", value: "Yes" });
  }

  if (isPha) {
    keyFacts.push({ label: "Potentially Hazardous", value: "Yes" });
  }

  // Generate summary
  const typeWord = kind === "comet" ? "comet" : "asteroid";
  let summary = `${displayName} is a${kind === "asteroid" ? "n" : ""} ${typeWord}`;
  summary += ` in the ${getOrbitClassName(orbitClass)} orbit class.`;

  if (isNeo) {
    summary += " It is classified as a Near-Earth Object (NEO).";
  }
  if (isPha) {
    summary += " It is potentially hazardous.";
  }
  if (diameter !== undefined && !isNaN(diameter)) {
    summary += ` Its estimated diameter is ${formatNumber(diameter)} km.`;
  }

  const spkid = getValue("spkid");
  const uniqueId = pdes || spkid || fullName || displayName;
  const sourceId = spkid || pdes || displayName;
  
  // Only append displayName if it actually differs (prevents "2025 Y3-2025 Y3")
  const norm = (s: string) => s.trim().toLowerCase();
  const idSource = displayName && uniqueId && norm(displayName) !== norm(uniqueId)
    ? `${uniqueId}-${displayName}`
    : uniqueId;

  return {
    id: createSlug(idSource),
    type: "SMALL_BODY",
    displayName,
    aliases: fullName && fullName !== displayName ? [fullName] : [],
    source: "JPL_SBDB",
    sourceId,
    summary,
    keyFacts,
    links: [
      {
        label: "JPL Small-Body Database",
        url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(pdes || displayName)}`,
      },
    ],
    bodyKind: kind,
    orbitClass: getOrbitClassName(orbitClass),
    isNeo,
    isPha,
    diameterKm: diameter,
    absoluteMagnitude,
    raw: {
      spkid: getValue("spkid"),
      fullName,
      kind: getValue("kind"),
      pdes,
      name,
      neo: getValue("neo"),
      pha: getValue("pha"),
      class: orbitClass,
    },
  };
}

// Fallback search using lookup API with sstr parameter
// This is faster than sb-cdata regex but only works for search queries
async function searchWithLookupFallback(
  query: string,
  params: SmallBodyQueryParams,
  signal?: AbortSignal
): Promise<SmallBodyData[]> {
  const url = new URL(LOOKUP_API_URL);
  url.searchParams.set("sstr", query);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 300 = multiple matches, 200 = single match, 404 = not found
    if (response.status === 404) {
      return [];
    }

    const data = await response.json();

    if (response.status === 300) {
      // Multiple matches - fetch each one (limit to first 20 to avoid overloading)
      const listData = data as SBDBLookupListResponse;
      const matchesToFetch = listData.list.slice(0, 20);

      const results = await Promise.all(
        matchesToFetch.map(async (match) => {
          try {
            // Use fetchSmallBodyByIdentifier to get full details
            const detail = await fetchSmallBodyByIdentifierDirect(match.pdes, signal);
            return detail;
          } catch {
            return null;
          }
        })
      );

      return results
        .filter((obj): obj is SmallBodyData => obj !== null)
        .filter((obj) => {
          // Apply filters client-side
          if (params.kind && obj.bodyKind !== params.kind) return false;
          if (params.neo && !obj.isNeo) return false;
          if (params.pha && !obj.isPha) return false;
          return true;
        });
    }

    if (response.ok && "object" in data) {
      // Single match - transform it
      const detail = await fetchSmallBodyByIdentifierDirect(data.object.des, signal);
      if (!detail) return [];

      // Apply filters
      if (params.kind && detail.bodyKind !== params.kind) return [];
      if (params.neo && !detail.isNeo) return [];
      if (params.pha && !detail.isPha) return [];

      return [detail];
    }

    return [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (signal?.aborted) throw new Error("Request cancelled");
    throw error;
  }
}

// Direct lookup without caching (used internally by fallback)
async function fetchSmallBodyByIdentifierDirect(
  identifier: string,
  signal?: AbortSignal
): Promise<SmallBodyData | null> {
  const sanitizedIdentifier = identifier.trim().substring(0, 100);

  const url = new URL(LOOKUP_API_URL);
  url.searchParams.set("sstr", sanitizedIdentifier);
  url.searchParams.set("phys-par", "true");
  url.searchParams.set("discovery", "true");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404 || response.status === 300) {
        return null;
      }
      throw new Error(`JPL API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== "object" || !("object" in data)) {
      return null;
    }

    // Transform using same logic as fetchSmallBodyByIdentifier
    const typedData = data as SBDBLookupResponse;
    const obj = typedData.object;
    const kind = parseBodyKind(obj.kind);

    let diameter: number | undefined;
    let absoluteMagnitude: number | undefined;

    if (typedData.phys_par && typedData.phys_par.length > 0) {
      const diameterParam = typedData.phys_par.find((p) => p.name === "diameter");
      if (diameterParam?.value) {
        diameter = parseFloat(diameterParam.value);
        if (isNaN(diameter)) diameter = undefined;
      }

      const hParam = typedData.phys_par.find((p) => p.name === "H");
      if (hParam?.value) {
        absoluteMagnitude = parseFloat(hParam.value);
        if (isNaN(absoluteMagnitude)) absoluteMagnitude = undefined;
      }
    }

    const displayName = obj.name || obj.shortname || obj.des || obj.fullname;
    const orbitClassName = obj.orbit_class?.name || getOrbitClassName(obj.orbit_class?.code);

    const keyFacts: KeyFact[] = [];
    keyFacts.push({ label: "Type", value: kind === "comet" ? "Comet" : "Asteroid" });
    keyFacts.push({ label: "Orbit Class", value: orbitClassName });

    if (diameter !== undefined) {
      keyFacts.push({ label: "Diameter", value: formatNumber(diameter, 2), unit: "km" });
    }
    if (absoluteMagnitude !== undefined) {
      keyFacts.push({ label: "Absolute Magnitude", value: formatNumber(absoluteMagnitude, 1), unit: "H" });
    }
    if (obj.neo) {
      keyFacts.push({ label: "Near-Earth Object", value: "Yes" });
    }
    if (obj.pha) {
      keyFacts.push({ label: "Potentially Hazardous", value: "Yes" });
    }

    let discoveredYear: number | undefined;
    if (typedData.discovery?.date) {
      const year = parseInt(typedData.discovery.date.substring(0, 4), 10);
      if (!isNaN(year)) {
        discoveredYear = year;
        keyFacts.push({ label: "Discovered", value: typedData.discovery.date });
      }
    }

    const typeWord = kind === "comet" ? "comet" : "asteroid";
    let summary = `${displayName} is a${kind === "asteroid" ? "n" : ""} ${typeWord}`;
    summary += ` classified in the ${orbitClassName} orbit class.`;

    if (obj.neo) summary += " It is a Near-Earth Object (NEO).";
    if (obj.pha) summary += " It has been identified as potentially hazardous.";
    if (diameter !== undefined) summary += ` Its estimated diameter is ${formatNumber(diameter)} km.`;

    const uniqueId = obj.des || obj.spkid || obj.fullname || displayName;
    const sourceId = obj.spkid || obj.des || displayName;

    const norm = (s: string) => s.trim().toLowerCase();
    const idSource =
      displayName && uniqueId && norm(displayName) !== norm(uniqueId)
        ? `${uniqueId}-${displayName}`
        : uniqueId;

    return {
      id: createSlug(idSource),
      type: "SMALL_BODY",
      displayName,
      aliases: obj.fullname !== displayName ? [obj.fullname] : [],
      source: "JPL_SBDB",
      sourceId,
      summary,
      keyFacts,
      links: [
        {
          label: "JPL Small-Body Database",
          url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(obj.des || displayName)}`,
        },
      ],
      discoveredYear,
      bodyKind: kind,
      orbitClass: orbitClassName,
      isNeo: obj.neo,
      isPha: obj.pha,
      diameterKm: diameter,
      absoluteMagnitude,
      raw: typedData as unknown as Record<string, unknown>,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (signal?.aborted) throw new Error("Request cancelled");
    throw error;
  }
}

// Primary search using sb-cdata regex (comprehensive but slow)
async function fetchSmallBodiesPrimary(
  params: SmallBodyQueryParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<SmallBodyData>> {
  const url = buildQueryUrl(params);
  const startTime = Date.now();

  // Create AbortController for timeout, link with external signal if provided
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  // If external signal aborts, abort our controller too
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let status = 0;
  let contentType: string | null = null;
  let responseText = "";

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    status = response.status;
    contentType = response.headers.get("content-type");

    if (!response.ok) {
      responseText = await response.text().catch(() => "");
      logApiRequest({
        endpoint: "sbdb_query",
        method: "GET",
        paramsSet: {
          query: !!params.query,
          kind: !!params.kind,
          neo: !!params.neo,
          pha: !!params.pha,
        },
        queryLength: params.query?.length || 0,
        status,
        contentType,
        latencyMs: Date.now() - startTime,
        responseSnippet: redactSensitive(responseText),
      });
      throw new Error(`JPL API error: ${response.status} ${response.statusText}`);
    }

    let data: SBDBQueryResponse;
    try {
      responseText = await response.text();
      data = JSON.parse(responseText);
    } catch {
      logApiRequest({
        endpoint: "sbdb_query",
        method: "GET",
        paramsSet: {
          query: !!params.query,
          kind: !!params.kind,
          neo: !!params.neo,
          pha: !!params.pha,
        },
        queryLength: params.query?.length || 0,
        status,
        contentType,
        latencyMs: Date.now() - startTime,
        responseSnippet: redactSensitive(responseText),
      });
      throw new Error("Failed to parse JPL API response as JSON");
    }

    // Validate response structure
    if (!data || typeof data !== "object") {
      throw new Error("Invalid JPL API response: expected object");
    }

    if (!Array.isArray(data.fields)) {
      throw new Error("Invalid JPL API response: fields must be an array");
    }

    if (!Array.isArray(data.data)) {
      throw new Error("Invalid JPL API response: data must be an array");
    }

    // Check for error messages in response
    if ("message" in data && typeof data.message === "string") {
      logApiRequest({
        endpoint: "sbdb_query",
        method: "GET",
        paramsSet: {
          query: !!params.query,
          kind: !!params.kind,
          neo: !!params.neo,
          pha: !!params.pha,
        },
        queryLength: params.query?.length || 0,
        status,
        contentType,
        latencyMs: Date.now() - startTime,
        responseSnippet: redactSensitive(JSON.stringify(data)),
      });
      throw new Error(`JPL API error: ${data.message}`);
    }

    const objects = data.data
      .map((row) => transformFromQuery(row, data.fields))
      .filter((obj): obj is SmallBodyData => obj !== null);

    const total = parseInt(data.count, 10) || objects.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);

    return {
      objects,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Log the error if not already logged
    if (error instanceof Error && error.name === "AbortError") {
      // Check if it was user-initiated cancellation vs timeout
      if (signal?.aborted) {
        throw new Error("Request cancelled");
      }
      logApiRequest({
        endpoint: "sbdb_query",
        method: "GET",
        paramsSet: {
          query: !!params.query,
          kind: !!params.kind,
          neo: !!params.neo,
          pha: !!params.pha,
        },
        queryLength: params.query?.length || 0,
        status: 0,
        contentType: null,
        latencyMs: Date.now() - startTime,
        responseSnippet: "Request timed out",
      });
      throw new Error("Request to JPL API timed out");
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred while fetching small bodies");
  }
}

// Fetch small bodies with caching and fallback strategy
export async function fetchSmallBodies(
  params: SmallBodyQueryParams,
  signal?: AbortSignal // Optional external signal for cancellation
): Promise<PaginatedResponse<SmallBodyData>> {
  // Normalize cache key (lowercase query, trim whitespace)
  const normalizedParams = {
    ...params,
    query: params.query?.toLowerCase().trim() || undefined,
  };
  const cacheKey = `${CACHE_KEYS.SMALL_BODY_BROWSE}:${hashParams(normalizedParams as Record<string, unknown>)}`;

  return withCache(cacheKey, CACHE_TTL.SMALL_BODIES_BROWSE, async () => {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);

    // Try primary approach first
    try {
      return await fetchSmallBodiesPrimary(params, signal);
    } catch (primaryError) {
      // If user cancelled, don't try fallback
      if (primaryError instanceof Error && primaryError.message.includes("cancelled")) {
        throw primaryError;
      }

      // If upstream failure (5xx/timeout), try fallback for search queries only
      // For non-search browse (no query), there's no fallback - re-throw
      const sanitizedQuery = sanitizeQuery(params.query);
      if (!sanitizedQuery) {
        throw primaryError;
      }

      // If contract mismatch or upstream failure, try the lookup API fallback
      if (isContractMismatch(primaryError) || isUpstreamFailure(primaryError)) {
        console.warn("[SBDB] Primary search failed, trying lookup API fallback");

        try {
          const fallbackResults = await searchWithLookupFallback(sanitizedQuery, params, signal);

          // Apply pagination to fallback results
          const startIdx = (page - 1) * limit;
          const paginatedResults = fallbackResults.slice(startIdx, startIdx + limit);

          return {
            objects: paginatedResults,
            total: fallbackResults.length,
            page,
            limit,
            hasMore: startIdx + limit < fallbackResults.length,
          };
        } catch (fallbackError) {
          // If fallback also fails, return empty results for contract errors
          // This prevents user-facing errors on API contract changes
          if (isContractMismatch(fallbackError)) {
            console.warn("[SBDB] Fallback also failed with contract mismatch, returning empty results");
            return { objects: [], total: 0, page, limit, hasMore: false };
          }

          // If user cancelled during fallback
          if (fallbackError instanceof Error && fallbackError.message.includes("cancelled")) {
            throw fallbackError;
          }

          // For other errors (including timeout), throw the original primary error
          // as it's more informative
          throw primaryError;
        }
      }

      // For other errors, re-throw
      throw primaryError;
    }
  });
}

// Fetch single small body by identifier
export async function fetchSmallBodyByIdentifier(identifier: string): Promise<SmallBodyData | null> {
  const cacheKey = `${CACHE_KEYS.SMALL_BODY_DETAIL}:${createSlug(identifier)}`;

  return withCache(cacheKey, CACHE_TTL.SMALL_BODIES_DETAIL, async () => {
    // Sanitize identifier
    const sanitizedIdentifier = identifier.trim().substring(0, 100);
    
    const url = new URL(LOOKUP_API_URL);
    url.searchParams.set("sstr", sanitizedIdentifier);
    url.searchParams.set("phys-par", "true");
    url.searchParams.set("discovery", "true");

    // Create AbortController for timeout (lookup is faster, use shorter timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

    let data: unknown;
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`JPL API error: ${response.status} ${response.statusText}`);
      }

      try {
        data = await response.json();
      } catch {
        throw new Error("Failed to parse JPL API response as JSON");
      }

      // Validate response structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid JPL API response: expected object");
      }

      // JPL API returns { message: "...", code: "200" } for not found objects
      if ("message" in data || (data as { code?: string }).code === "200" || !("object" in data)) {
        return null;
      }

      // At this point, data is validated and contains an object
      const typedData = data as SBDBLookupResponse;

      // Validate object structure
      if (!typedData.object || typeof typedData.object !== "object") {
        return null;
      }

      const obj = typedData.object;
      const kind = parseBodyKind(obj.kind);

      // Extract physical parameters - search through array by name
      let diameter: number | undefined;
      let absoluteMagnitude: number | undefined;

      if (typedData.phys_par && typedData.phys_par.length > 0) {
        // Find diameter parameter
        const diameterParam = typedData.phys_par.find(p => p.name === "diameter");
        if (diameterParam?.value) {
          diameter = parseFloat(diameterParam.value);
          if (isNaN(diameter)) diameter = undefined;
        }

        // Find absolute magnitude (H) parameter
        const hParam = typedData.phys_par.find(p => p.name === "H");
        if (hParam?.value) {
          absoluteMagnitude = parseFloat(hParam.value);
          if (isNaN(absoluteMagnitude)) absoluteMagnitude = undefined;
        }
      }

      // Prefer shortname (e.g., "1 Ceres") over des (e.g., "1") or fullname
      const displayName = obj.name || obj.shortname || obj.des || obj.fullname;
      const orbitClassName = obj.orbit_class?.name || getOrbitClassName(obj.orbit_class?.code);

      const keyFacts: KeyFact[] = [];

      keyFacts.push({ label: "Type", value: kind === "comet" ? "Comet" : "Asteroid" });
      keyFacts.push({ label: "Orbit Class", value: orbitClassName });

      if (diameter !== undefined) {
        keyFacts.push({ label: "Diameter", value: formatNumber(diameter, 2), unit: "km" });
      }

      if (absoluteMagnitude !== undefined) {
        keyFacts.push({ label: "Absolute Magnitude", value: formatNumber(absoluteMagnitude, 1), unit: "H" });
      }

      if (obj.neo) {
        keyFacts.push({ label: "Near-Earth Object", value: "Yes" });
      }

      if (obj.pha) {
        keyFacts.push({ label: "Potentially Hazardous", value: "Yes" });
      }

      // Discovery info
      let discoveredYear: number | undefined;
      if (typedData.discovery?.date) {
        const year = parseInt(typedData.discovery.date.substring(0, 4), 10);
        if (!isNaN(year)) {
          discoveredYear = year;
          keyFacts.push({ label: "Discovered", value: typedData.discovery.date });
        }
      }

      if (typedData.discovery?.who) {
        keyFacts.push({ label: "Discoverer", value: typedData.discovery.who });
      }

      // Generate summary
      const typeWord = kind === "comet" ? "comet" : "asteroid";
      let summary = `${displayName} is a${kind === "asteroid" ? "n" : ""} ${typeWord}`;
      summary += ` classified in the ${orbitClassName} orbit class.`;

      if (obj.neo) {
        summary += " It is a Near-Earth Object (NEO).";
      }
      if (obj.pha) {
        summary += " It has been identified as potentially hazardous.";
      }
      if (diameter !== undefined) {
        summary += ` Its estimated diameter is ${formatNumber(diameter)} km.`;
      }
      if (typedData.discovery?.date && typedData.discovery?.who) {
        summary += ` It was discovered on ${typedData.discovery.date} by ${typedData.discovery.who}.`;
      }

      const uniqueId = obj.des || obj.spkid || obj.fullname || displayName;
      const sourceId = obj.spkid || obj.des || displayName;
      
      const norm = (s: string) => s.trim().toLowerCase();
      const idSource = displayName && uniqueId && norm(displayName) !== norm(uniqueId)
        ? `${uniqueId}-${displayName}`
        : uniqueId;

      return {
        id: createSlug(idSource),
        type: "SMALL_BODY",
        displayName,
        aliases: obj.fullname !== displayName ? [obj.fullname] : [],
        source: "JPL_SBDB",
        sourceId,
        summary,
        keyFacts,
        links: [
          {
            label: "JPL Small-Body Database",
            url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(obj.des || displayName)}`,
          },
        ],
        discoveredYear,
        bodyKind: kind,
        orbitClass: orbitClassName,
        isNeo: obj.neo,
        isPha: obj.pha,
        diameterKm: diameter,
        absoluteMagnitude,
        raw: typedData as unknown as Record<string, unknown>,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request to JPL API timed out");
        }
        throw error;
      }
      throw new Error("Unknown error occurred while fetching small body");
    }
  });
}

// Fetch small body by slug (URL-encoded identifier)
// decodeSlug() recovers the original identifier exactly, then we do a direct lookup
export async function fetchSmallBodyBySlug(slug: string): Promise<SmallBodyData | null> {
  const identifier = decodeSlug(slug);
  return fetchSmallBodyByIdentifier(identifier);
}


