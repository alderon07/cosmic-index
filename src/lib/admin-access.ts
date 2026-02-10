import { getProRolloutAdminIds } from "@/lib/runtime-mode";

export function getProRolloutAdminSet(): Set<string> {
  return new Set(getProRolloutAdminIds());
}

export function isProRolloutAdminConfigured(): boolean {
  return getProRolloutAdminSet().size > 0;
}

export function isProRolloutAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getProRolloutAdminSet().has(userId);
}
