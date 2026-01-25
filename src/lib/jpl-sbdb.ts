import {
  SmallBodyData,
  SmallBodyQueryParams,
  PaginatedResponse,
  SmallBodyKind,
  createSlug,
  formatNumber,
  KeyFact,
  ORBIT_CLASSES,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS, hashParams } from "./cache";

const QUERY_API_URL = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";
const LOOKUP_API_URL = "https://ssd-api.jpl.nasa.gov/sbdb.api";

// Timeout for external API calls (10 seconds)
const API_TIMEOUT_MS = 10 * 1000;

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

// Fetch small bodies with caching
export async function fetchSmallBodies(
  params: SmallBodyQueryParams
): Promise<PaginatedResponse<SmallBodyData>> {
  const cacheKey = `${CACHE_KEYS.SMALL_BODY_BROWSE}:${hashParams(params as Record<string, unknown>)}`;

  return withCache(cacheKey, CACHE_TTL.SMALL_BODIES_BROWSE, async () => {
    const url = buildQueryUrl(params);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`JPL API error: ${response.status} ${response.statusText}`);
      }

      let data: SBDBQueryResponse;
      try {
        data = await response.json();
      } catch {
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
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request to JPL API timed out");
        }
        throw error;
      }
      throw new Error("Unknown error occurred while fetching small bodies");
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

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

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

// Fetch small body by slug
export async function fetchSmallBodyBySlug(slug: string): Promise<SmallBodyData | null> {
  const cleaned = slug.trim().toLowerCase();

  // 1) Asteroid provisional designation FIRST:
  //    "2025-y3-panstarrs" -> "2025 Y3"
  //    "2014-mu69" -> "2014 MU69"
  const provisionalMatch = cleaned.match(/^(\d{4})-([a-z]{1,2}\d+)(?:-.+)?$/i);
  if (provisionalMatch) {
    const year = provisionalMatch[1];
    const code = provisionalMatch[2].toUpperCase();
    return fetchSmallBodyByIdentifier(`${year} ${code}`);
  }

  // 2) Modern comet designation:
  //    "c-2021-a1-leonard" -> "C/2021 A1"
  //    Supports: c-, p-, d-, x-, i-, a-
  const modernCometMatch = cleaned.match(/^([cpdxia])-(\d{4})-([a-z]{1,2}\d*)-(.+)$/i);
  if (modernCometMatch) {
    const prefix = modernCometMatch[1].toUpperCase();
    const year = modernCometMatch[2];
    const code = modernCometMatch[3].toUpperCase();
    return fetchSmallBodyByIdentifier(`${prefix}/${year} ${code}`);
  }

  // 3) Periodic comet by number+letter:
  //    "1p-halley" -> "1P"
  //    "73p-schwassmann-wachmann-3" -> "73P"
  const periodicCometMatch = cleaned.match(/^(\d{1,4})([pdxia])-(.+)$/i);
  if (periodicCometMatch) {
    const identifier = `${periodicCometMatch[1]}${periodicCometMatch[2].toUpperCase()}`;
    return fetchSmallBodyByIdentifier(identifier);
  }

  // 4) Numbered asteroid (only if the segment after the dash is NOT like "y3"/"mu69"):
  //    "433-eros" -> "433"
  //    "2025-nortia" -> "2025"
  //    But NOT "2025-y3-..." (already caught above)
  const numberedMatch = cleaned.match(/^(\d{1,7})-([a-z][a-z-]*)$/i);
  if (numberedMatch) {
    return fetchSmallBodyByIdentifier(numberedMatch[1]);
  }

  // 5) Fallback: convert slug back to a search string for SBDB.
  const searchTerm = cleaned.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return fetchSmallBodyByIdentifier(searchTerm);
}


