import { getInternalAdminIds } from "@/lib/runtime-mode";

export function getInternalAdminSet(): Set<string> {
  return new Set(getInternalAdminIds());
}

export function isInternalAdminConfigured(): boolean {
  return getInternalAdminSet().size > 0;
}

export function isInternalAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getInternalAdminSet().has(userId);
}

/**
 * @deprecated Prefer getInternalAdminSet().
 */
export function getProRolloutAdminSet(): Set<string> {
  return getInternalAdminSet();
}

/**
 * @deprecated Prefer isInternalAdminConfigured().
 */
export function isProRolloutAdminConfigured(): boolean {
  return isInternalAdminConfigured();
}

/**
 * @deprecated Prefer isInternalAdmin().
 */
export function isProRolloutAdmin(userId: string | null | undefined): boolean {
  return isInternalAdmin(userId);
}
