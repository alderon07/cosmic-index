export interface SavedObjectsCursor {
  createdAt: string;
  id: number;
}

export interface CollectionsCursor {
  updatedAt: string;
  id: number;
}

export interface CollectionItemsCursor {
  position: number;
  id: number;
}

function encodeCursor(payload: Record<string, number | string>): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): unknown {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  return JSON.parse(decoded);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parsePaginationLimit(
  rawLimit: string | null,
  defaultLimit: number,
  maxLimit = 100,
): number {
  if (!rawLimit) return defaultLimit;

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(maxLimit, parsed);
}

export function encodeSavedObjectsCursor(cursor: SavedObjectsCursor): string {
  return encodeCursor({ createdAt: cursor.createdAt, id: cursor.id });
}

export function decodeSavedObjectsCursor(rawCursor: string): SavedObjectsCursor | null {
  try {
    const decoded = decodeCursor(rawCursor) as Record<string, unknown>;
    if (typeof decoded.createdAt !== "string" || !isFiniteNumber(decoded.id)) {
      return null;
    }
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    return null;
  }
}

export function encodeCollectionsCursor(cursor: CollectionsCursor): string {
  return encodeCursor({ updatedAt: cursor.updatedAt, id: cursor.id });
}

export function decodeCollectionsCursor(rawCursor: string): CollectionsCursor | null {
  try {
    const decoded = decodeCursor(rawCursor) as Record<string, unknown>;
    if (typeof decoded.updatedAt !== "string" || !isFiniteNumber(decoded.id)) {
      return null;
    }
    return { updatedAt: decoded.updatedAt, id: decoded.id };
  } catch {
    return null;
  }
}

export function encodeCollectionItemsCursor(cursor: CollectionItemsCursor): string {
  return encodeCursor({ position: cursor.position, id: cursor.id });
}

export function decodeCollectionItemsCursor(rawCursor: string): CollectionItemsCursor | null {
  try {
    const decoded = decodeCursor(rawCursor) as Record<string, unknown>;
    if (!isFiniteNumber(decoded.position) || !isFiniteNumber(decoded.id)) {
      return null;
    }
    return { position: decoded.position, id: decoded.id };
  } catch {
    return null;
  }
}
