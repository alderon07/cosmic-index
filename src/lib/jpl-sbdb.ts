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
  phys_par?: {
    diameter?: string;
    H?: string;
    albedo?: string;
    rot_per?: string;
  }[];
  discovery?: {
    date?: string;
    location?: string;
    who?: string;
  };
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

  // Search query
  if (params.query) {
    url.searchParams.set("sb-name", params.query);
  }

  // Pagination
  const limit = params.limit || 20;
  const offset = ((params.page || 1) - 1) * limit;
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

  const spkid = getValue("spkid") || pdes || displayName;

  return {
    id: createSlug(displayName),
    type: "SMALL_BODY",
    displayName,
    aliases: fullName && fullName !== displayName ? [fullName] : [],
    source: "JPL_SBDB",
    sourceId: spkid,
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

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`JPL API error: ${response.status} ${response.statusText}`);
    }

    const data: SBDBQueryResponse = await response.json();

    const objects = data.data
      .map((row) => transformFromQuery(row, data.fields))
      .filter((obj): obj is SmallBodyData => obj !== null);

    const total = parseInt(data.count, 10) || objects.length;
    const page = params.page || 1;
    const limit = params.limit || 20;

    return {
      objects,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  });
}

// Fetch single small body by identifier
export async function fetchSmallBodyByIdentifier(identifier: string): Promise<SmallBodyData | null> {
  const cacheKey = `${CACHE_KEYS.SMALL_BODY_DETAIL}:${createSlug(identifier)}`;

  return withCache(cacheKey, CACHE_TTL.SMALL_BODIES_DETAIL, async () => {
    const url = new URL(LOOKUP_API_URL);
    url.searchParams.set("sstr", identifier);
    url.searchParams.set("phys-par", "true");
    url.searchParams.set("discovery", "true");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`JPL API error: ${response.status} ${response.statusText}`);
    }

    const data: SBDBLookupResponse = await response.json();

    if (!data.object) {
      return null;
    }

    const obj = data.object;
    const kind = parseBodyKind(obj.kind);

    // Extract physical parameters
    let diameter: number | undefined;
    let absoluteMagnitude: number | undefined;

    if (data.phys_par && data.phys_par.length > 0) {
      const phys = data.phys_par[0];
      if (phys.diameter) {
        diameter = parseFloat(phys.diameter);
        if (isNaN(diameter)) diameter = undefined;
      }
      if (phys.H) {
        absoluteMagnitude = parseFloat(phys.H);
        if (isNaN(absoluteMagnitude)) absoluteMagnitude = undefined;
      }
    }

    const displayName = obj.name || obj.des || obj.fullname;
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
    if (data.discovery?.date) {
      const year = parseInt(data.discovery.date.substring(0, 4), 10);
      if (!isNaN(year)) {
        discoveredYear = year;
        keyFacts.push({ label: "Discovered", value: data.discovery.date });
      }
    }

    if (data.discovery?.who) {
      keyFacts.push({ label: "Discoverer", value: data.discovery.who });
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
    if (data.discovery?.date && data.discovery?.who) {
      summary += ` It was discovered on ${data.discovery.date} by ${data.discovery.who}.`;
    }

    return {
      id: createSlug(displayName),
      type: "SMALL_BODY",
      displayName,
      aliases: obj.fullname !== displayName ? [obj.fullname] : [],
      source: "JPL_SBDB",
      sourceId: obj.spkid || obj.des,
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
      raw: data as unknown as Record<string, unknown>,
    };
  });
}

// Fetch small body by slug
export async function fetchSmallBodyBySlug(slug: string): Promise<SmallBodyData | null> {
  // Convert slug back to search term
  const searchTerm = slug.replace(/-/g, " ");
  return fetchSmallBodyByIdentifier(searchTerm);
}
