/**
 * Store and retrieve list page URLs to preserve pagination/filters when navigating back.
 * Uses sessionStorage so state persists during the session but not across sessions.
 */

const STORAGE_KEY = "cosmic-index:list-urls";

type ListCategory = "exoplanets" | "stars" | "small-bodies";

interface ListUrlStore {
  exoplanets?: string;
  stars?: string;
  "small-bodies"?: string;
}

function getStore(): ListUrlStore {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStore(store: ListUrlStore): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save the current list page URL for a category.
 * Call this from list pages when their URL changes.
 */
export function saveListUrl(category: ListCategory, url: string): void {
  const store = getStore();
  store[category] = url;
  setStore(store);
}

/**
 * Get the saved list URL for a category.
 * Returns the base path if no saved URL exists.
 */
export function getListUrl(category: ListCategory): string {
  const store = getStore();
  return store[category] || `/${category}`;
}

/**
 * Map base paths to their categories.
 */
export function getCategoryFromPath(path: string): ListCategory | null {
  if (path === "/exoplanets") return "exoplanets";
  if (path === "/stars") return "stars";
  if (path === "/small-bodies") return "small-bodies";
  return null;
}
