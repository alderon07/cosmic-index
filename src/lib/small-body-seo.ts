import type { SmallBodyData } from "@/lib/types";

const NUMERIC_NAME_PATTERN = /^\d+$/;
const PROVISIONAL_DESIGNATION_PATTERN = /^\d{4}\s+[A-Z]{1,3}\d{0,4}$/i;

function hasProperName(displayName: string): boolean {
  const name = displayName.trim();
  return (
    /[A-Za-z]{3}/.test(name)
    && !NUMERIC_NAME_PATTERN.test(name)
    && !PROVISIONAL_DESIGNATION_PATTERN.test(name)
  );
}

export function shouldIndexSmallBody(smallBody: SmallBodyData): boolean {
  const isPriorityObject = smallBody.isPha || smallBody.isNeo || smallBody.bodyKind === "comet";
  const isDataRich = smallBody.diameterKm !== undefined && smallBody.discoveredYear !== undefined;

  return isPriorityObject || hasProperName(smallBody.displayName) || isDataRich;
}
