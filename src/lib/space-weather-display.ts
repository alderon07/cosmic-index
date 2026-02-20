function normalizeText(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function stripLocationPrefix(instrument: string, location: string): string | undefined {
  const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedLocation}\\s*:\\s*(.+)$`, "i");
  const match = instrument.match(pattern);
  if (!match) return undefined;
  return normalizeText(match[1]);
}

function inferLocationFromInstrument(instrument?: string): string | undefined {
  const normalized = normalizeText(instrument);
  if (!normalized) return undefined;

  const separatorIndex = normalized.indexOf(":");
  if (separatorIndex <= 0) return undefined;

  const prefix = normalizeText(normalized.slice(0, separatorIndex));
  const suffix = normalizeText(normalized.slice(separatorIndex + 1));
  return prefix && suffix ? prefix : undefined;
}

export interface IPSDisplayMetrics {
  location: string;
  instrument?: string;
}

export function getIPSDisplayMetrics(
  location?: string,
  instrument?: string,
): IPSDisplayMetrics {
  const normalizedLocation = normalizeText(location);
  const normalizedInstrument = normalizeText(instrument);
  const inferredLocation = inferLocationFromInstrument(normalizedInstrument);
  const resolvedLocation = normalizedLocation ?? inferredLocation ?? "Unknown";

  if (!normalizedInstrument) {
    return { location: resolvedLocation };
  }

  if (normalizedLocation && equalsIgnoreCase(normalizedInstrument, normalizedLocation)) {
    return { location: resolvedLocation };
  }

  const strippedWithKnownLocation = normalizedLocation
    ? stripLocationPrefix(normalizedInstrument, normalizedLocation)
    : undefined;
  const strippedWithInferredLocation =
    !normalizedLocation && !strippedWithKnownLocation && inferredLocation
    ? stripLocationPrefix(normalizedInstrument, inferredLocation)
    : undefined;

  return {
    location: resolvedLocation,
    instrument: strippedWithKnownLocation ?? strippedWithInferredLocation ?? normalizedInstrument,
  };
}
