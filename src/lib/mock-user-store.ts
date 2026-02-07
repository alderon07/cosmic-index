import { Collection, SavedObject, SavedSearch, Alert } from "./types";
import { canonicalizeAndHash } from "./saved-searches";
import { getMockUserEmail, getMockUserId, getMockUserTier } from "./runtime-mode";

interface MockUserRecord {
  id: string;
  email: string;
  tier: "free" | "pro";
  stripeCustomerId: string | null;
}

interface MockCollectionItem {
  id: number;
  collectionId: number;
  savedObjectId: number;
  position: number;
  addedAt: string;
}

interface MockSavedObjectRecord extends SavedObject {
  userId: string;
}

interface MockCollectionRecord extends Collection {
  userId: string;
}

interface MockSavedSearchRecord extends SavedSearch {
  userId: string;
  paramsHash: string;
}

interface MockAlertRecord extends Alert {
  userId: string;
}

interface MockStore {
  users: MockUserRecord[];
  savedObjects: MockSavedObjectRecord[];
  collections: MockCollectionRecord[];
  collectionItems: MockCollectionItem[];
  savedSearches: MockSavedSearchRecord[];
  alerts: MockAlertRecord[];
  counters: {
    savedObject: number;
    collection: number;
    collectionItem: number;
    savedSearch: number;
    alert: number;
  };
}

declare global {
  var __cosmicMockUserStore: MockStore | undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function seedStore(): MockStore {
  const userId = getMockUserId();
  const createdAt = nowIso();

  const savedObjects: MockSavedObjectRecord[] = [
    {
      id: 1,
      userId,
      canonicalId: "exoplanet:kepler-186-f",
      displayName: "Kepler-186 f",
      notes: "Potentially rocky world in a habitable zone.",
      eventPayload: null,
      createdAt,
    },
    {
      id: 2,
      userId,
      canonicalId: "star:trappist-1",
      displayName: "TRAPPIST-1",
      notes: null,
      eventPayload: null,
      createdAt,
    },
  ];

  const collections: MockCollectionRecord[] = [
    {
      id: 1,
      userId,
      name: "Weekly Watchlist",
      description: "Objects to revisit every week",
      color: "#f97316",
      icon: "folder",
      isPublic: false,
      itemCount: 2,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const collectionItems: MockCollectionItem[] = [
    {
      id: 1,
      collectionId: 1,
      savedObjectId: 1,
      position: 0,
      addedAt: createdAt,
    },
    {
      id: 2,
      collectionId: 1,
      savedObjectId: 2,
      position: 1,
      addedAt: createdAt,
    },
  ];

  const { canonical, hash } = canonicalizeAndHash({
    query: "kepler",
    sort: "discovered",
  });

  const savedSearches: MockSavedSearchRecord[] = [
    {
      id: 1,
      userId,
      name: "Kepler Discoveries",
      category: "exoplanets",
      queryParams: JSON.parse(canonical),
      resultCount: null,
      lastExecutedAt: createdAt,
      createdAt,
      paramsHash: hash,
    },
  ];

  return {
    users: [
      {
        id: userId,
        email: getMockUserEmail(),
        tier: getMockUserTier(),
        stripeCustomerId: null,
      },
    ],
    savedObjects,
    collections,
    collectionItems,
    savedSearches,
    alerts: [],
    counters: {
      savedObject: 3,
      collection: 2,
      collectionItem: 3,
      savedSearch: 2,
      alert: 1,
    },
  };
}

function getStore(): MockStore {
  if (!globalThis.__cosmicMockUserStore) {
    globalThis.__cosmicMockUserStore = seedStore();
  }
  return globalThis.__cosmicMockUserStore;
}

function ensureUser(store: MockStore, userId: string): MockUserRecord {
  const existing = store.users.find((user) => user.id === userId);
  if (existing) return existing;

  const created: MockUserRecord = {
    id: userId,
    email: getMockUserEmail(),
    tier: getMockUserTier(),
    stripeCustomerId: null,
  };
  store.users.push(created);
  return created;
}

function recalcCollectionCounts(store: MockStore, userId: string): void {
  for (const collection of store.collections.filter((c) => c.userId === userId)) {
    collection.itemCount = store.collectionItems.filter(
      (item) => item.collectionId === collection.id
    ).length;
  }
}

function sortSavedByDateDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMockUserRecord(userId: string): MockUserRecord {
  const store = getStore();
  return ensureUser(store, userId);
}

export function setMockUserTier(userId: string, tier: "free" | "pro"): MockUserRecord {
  const store = getStore();
  const user = ensureUser(store, userId);
  user.tier = tier;
  return user;
}

export function setMockStripeCustomer(
  userId: string,
  stripeCustomerId: string | null
): MockUserRecord {
  const store = getStore();
  const user = ensureUser(store, userId);
  user.stripeCustomerId = stripeCustomerId;
  return user;
}

export function listSavedObjects(
  userId: string,
  page: number,
  limit: number
): { objects: SavedObject[]; total: number; hasMore: boolean } {
  const store = getStore();
  const all = sortSavedByDateDesc(
    store.savedObjects.filter((obj) => obj.userId === userId)
  );

  const total = all.length;
  const offset = (page - 1) * limit;
  const objects = all.slice(offset, offset + limit).map((obj) => ({ ...obj }));

  return {
    objects,
    total,
    hasMore: page * limit < total,
  };
}

export function getSavedObjectById(userId: string, id: number): SavedObject | null {
  const store = getStore();
  const object = store.savedObjects.find((obj) => obj.userId === userId && obj.id === id);
  return object ? { ...object } : null;
}

export function saveObject(input: {
  userId: string;
  canonicalId: string;
  displayName: string;
  notes?: string | null;
  eventPayload?: Record<string, unknown> | null;
}): SavedObject {
  const store = getStore();
  const existing = store.savedObjects.find(
    (obj) => obj.userId === input.userId && obj.canonicalId === input.canonicalId
  );

  if (existing) {
    existing.displayName = input.displayName;
    if (input.notes !== undefined) {
      existing.notes = input.notes;
    }
    if (input.eventPayload !== undefined) {
      existing.eventPayload = input.eventPayload;
    }
    return { ...existing };
  }

  const object: MockSavedObjectRecord = {
    id: store.counters.savedObject++,
    userId: input.userId,
    canonicalId: input.canonicalId,
    displayName: input.displayName,
    notes: input.notes ?? null,
    eventPayload: input.eventPayload ?? null,
    createdAt: nowIso(),
  };

  store.savedObjects.push(object);
  return { ...object };
}

export function updateSavedObject(
  userId: string,
  id: number,
  notes: string | null
): SavedObject | null {
  const store = getStore();
  const object = store.savedObjects.find((obj) => obj.userId === userId && obj.id === id);
  if (!object) return null;

  object.notes = notes;
  return { ...object };
}

export function deleteSavedObject(userId: string, id: number): boolean {
  const store = getStore();
  const index = store.savedObjects.findIndex((obj) => obj.userId === userId && obj.id === id);
  if (index === -1) return false;

  store.savedObjects.splice(index, 1);
  store.collectionItems = store.collectionItems.filter((item) => item.savedObjectId !== id);
  recalcCollectionCounts(store, userId);
  return true;
}

export function checkSavedObjects(
  userId: string,
  canonicalIds: string[]
): Record<string, number> {
  const store = getStore();
  const saved = new Map(
    store.savedObjects
      .filter((obj) => obj.userId === userId)
      .map((obj) => [obj.canonicalId, obj.id])
  );

  const result: Record<string, number> = {};
  for (const canonicalId of canonicalIds) {
    const id = saved.get(canonicalId);
    if (id) {
      result[canonicalId] = id;
    }
  }
  return result;
}

export function listCollections(userId: string): Collection[] {
  const store = getStore();
  recalcCollectionCounts(store, userId);

  return store.collections
    .filter((collection) => collection.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((collection) => ({ ...collection }));
}

export function createCollection(input: {
  userId: string;
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
}): Collection | "DUPLICATE" {
  const store = getStore();
  const duplicate = store.collections.find(
    (collection) =>
      collection.userId === input.userId &&
      collection.name.toLowerCase() === input.name.trim().toLowerCase()
  );

  if (duplicate) {
    return "DUPLICATE";
  }

  const timestamp = nowIso();
  const created: MockCollectionRecord = {
    id: store.counters.collection++,
    userId: input.userId,
    name: input.name.trim(),
    description: input.description ?? null,
    color: input.color ?? "#f97316",
    icon: input.icon ?? "folder",
    isPublic: false,
    itemCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.collections.push(created);
  return { ...created };
}

export function getCollectionWithItems(
  userId: string,
  collectionId: number
): { collection: Collection; items: (SavedObject & { position: number })[] } | null {
  const store = getStore();
  const collection = store.collections.find(
    (item) => item.id === collectionId && item.userId === userId
  );

  if (!collection) {
    return null;
  }

  const items = store.collectionItems
    .filter((item) => item.collectionId === collectionId)
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const object = store.savedObjects.find((saved) => saved.id === item.savedObjectId);
      if (!object || object.userId !== userId) return null;
      return {
        id: object.id,
        canonicalId: object.canonicalId,
        displayName: object.displayName,
        notes: object.notes,
        eventPayload: object.eventPayload,
        createdAt: object.createdAt,
        position: item.position,
      };
    })
    .filter((item): item is SavedObject & { position: number } => item !== null);

  return {
    collection: { ...collection, itemCount: items.length },
    items,
  };
}

export function updateCollection(
  userId: string,
  collectionId: number,
  updates: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    isPublic?: boolean;
  }
): Collection | "DUPLICATE" | null {
  const store = getStore();
  const collection = store.collections.find(
    (item) => item.id === collectionId && item.userId === userId
  );

  if (!collection) return null;

  if (updates.name) {
    const duplicate = store.collections.find(
      (item) =>
        item.userId === userId &&
        item.id !== collectionId &&
        item.name.toLowerCase() === updates.name!.trim().toLowerCase()
    );
    if (duplicate) {
      return "DUPLICATE";
    }
    collection.name = updates.name.trim();
  }

  if (updates.description !== undefined) collection.description = updates.description;
  if (updates.color !== undefined) collection.color = updates.color;
  if (updates.icon !== undefined) collection.icon = updates.icon;
  if (updates.isPublic !== undefined) collection.isPublic = updates.isPublic;

  collection.updatedAt = nowIso();
  recalcCollectionCounts(store, userId);
  return { ...collection };
}

export function deleteCollection(userId: string, collectionId: number): boolean {
  const store = getStore();
  const index = store.collections.findIndex(
    (collection) => collection.userId === userId && collection.id === collectionId
  );
  if (index === -1) return false;

  store.collections.splice(index, 1);
  store.collectionItems = store.collectionItems.filter(
    (item) => item.collectionId !== collectionId
  );
  return true;
}

export function addCollectionItem(input: {
  userId: string;
  collectionId: number;
  savedObjectId: number;
  position?: number;
}): { success: true; position: number } | "COLLECTION_NOT_FOUND" | "OBJECT_NOT_FOUND" | "DUPLICATE" {
  const store = getStore();
  const collection = store.collections.find(
    (item) => item.id === input.collectionId && item.userId === input.userId
  );
  if (!collection) return "COLLECTION_NOT_FOUND";

  const object = store.savedObjects.find(
    (item) => item.id === input.savedObjectId && item.userId === input.userId
  );
  if (!object) return "OBJECT_NOT_FOUND";

  const duplicate = store.collectionItems.find(
    (item) => item.collectionId === input.collectionId && item.savedObjectId === input.savedObjectId
  );
  if (duplicate) return "DUPLICATE";

  const position =
    input.position ??
    (Math.max(
      -1,
      ...store.collectionItems
        .filter((item) => item.collectionId === input.collectionId)
        .map((item) => item.position)
    ) + 1);

  store.collectionItems.push({
    id: store.counters.collectionItem++,
    collectionId: input.collectionId,
    savedObjectId: input.savedObjectId,
    position,
    addedAt: nowIso(),
  });

  collection.updatedAt = nowIso();
  recalcCollectionCounts(store, input.userId);

  return { success: true, position };
}

export function removeCollectionItem(input: {
  userId: string;
  collectionId: number;
  savedObjectId: number;
}): boolean {
  const store = getStore();

  const collection = store.collections.find(
    (item) => item.id === input.collectionId && item.userId === input.userId
  );

  if (!collection) return false;

  const index = store.collectionItems.findIndex(
    (item) => item.collectionId === input.collectionId && item.savedObjectId === input.savedObjectId
  );

  if (index === -1) return false;

  store.collectionItems.splice(index, 1);
  collection.updatedAt = nowIso();
  recalcCollectionCounts(store, input.userId);
  return true;
}

export function listSavedSearches(
  userId: string,
  category?: "exoplanets" | "stars" | "small-bodies"
): SavedSearch[] {
  const store = getStore();

  return store.savedSearches
    .filter((search) => search.userId === userId)
    .filter((search) => (category ? search.category === category : true))
    .sort((a, b) => {
      const aTime = a.lastExecutedAt || a.createdAt;
      const bTime = b.lastExecutedAt || b.createdAt;
      return bTime.localeCompare(aTime);
    })
    .map((search) => ({
      id: search.id,
      name: search.name,
      category: search.category,
      queryParams: search.queryParams,
      resultCount: search.resultCount,
      lastExecutedAt: search.lastExecutedAt,
      createdAt: search.createdAt,
    }));
}

export function createSavedSearch(input: {
  userId: string;
  name: string;
  category: "exoplanets" | "stars" | "small-bodies";
  queryParams: Record<string, unknown>;
}): SavedSearch {
  const store = getStore();
  const { canonical, hash } = canonicalizeAndHash(input.queryParams);

  const existing = store.savedSearches.find(
    (search) =>
      search.userId === input.userId &&
      search.category === input.category &&
      search.paramsHash === hash
  );

  if (existing) {
    existing.name = input.name;
    existing.queryParams = JSON.parse(canonical);
    existing.lastExecutedAt = nowIso();
    return {
      id: existing.id,
      name: existing.name,
      category: existing.category,
      queryParams: existing.queryParams,
      resultCount: existing.resultCount,
      lastExecutedAt: existing.lastExecutedAt,
      createdAt: existing.createdAt,
    };
  }

  const createdAt = nowIso();
  const created: MockSavedSearchRecord = {
    id: store.counters.savedSearch++,
    userId: input.userId,
    name: input.name,
    category: input.category,
    queryParams: JSON.parse(canonical),
    resultCount: null,
    lastExecutedAt: createdAt,
    createdAt,
    paramsHash: hash,
  };

  store.savedSearches.push(created);

  return {
    id: created.id,
    name: created.name,
    category: created.category,
    queryParams: created.queryParams,
    resultCount: created.resultCount,
    lastExecutedAt: created.lastExecutedAt,
    createdAt: created.createdAt,
  };
}

export function getSavedSearchById(userId: string, searchId: number): SavedSearch | null {
  const store = getStore();
  const search = store.savedSearches.find(
    (item) => item.userId === userId && item.id === searchId
  );

  if (!search) return null;

  return {
    id: search.id,
    name: search.name,
    category: search.category,
    queryParams: search.queryParams,
    resultCount: search.resultCount,
    lastExecutedAt: search.lastExecutedAt,
    createdAt: search.createdAt,
  };
}

export function updateSavedSearch(
  userId: string,
  searchId: number,
  updates: { name?: string; resultCount?: number }
): SavedSearch | null {
  const store = getStore();
  const search = store.savedSearches.find(
    (item) => item.userId === userId && item.id === searchId
  );

  if (!search) return null;

  if (updates.name !== undefined) search.name = updates.name;
  if (updates.resultCount !== undefined) search.resultCount = updates.resultCount;
  search.lastExecutedAt = nowIso();

  return {
    id: search.id,
    name: search.name,
    category: search.category,
    queryParams: search.queryParams,
    resultCount: search.resultCount,
    lastExecutedAt: search.lastExecutedAt,
    createdAt: search.createdAt,
  };
}

export function deleteSavedSearch(userId: string, searchId: number): boolean {
  const store = getStore();
  const index = store.savedSearches.findIndex(
    (item) => item.userId === userId && item.id === searchId
  );

  if (index === -1) return false;

  store.savedSearches.splice(index, 1);
  return true;
}

export function listAlerts(userId: string): Alert[] {
  const store = getStore();
  return store.alerts
    .filter((alert) => alert.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((alert) => ({ ...alert }));
}

export function createAlert(input: {
  userId: string;
  alertType: "space_weather" | "fireball" | "close_approach";
  config: Record<string, unknown>;
  emailEnabled: boolean;
}): Alert {
  const store = getStore();
  const now = nowIso();
  const created: MockAlertRecord = {
    id: store.counters.alert++,
    userId: input.userId,
    alertType: input.alertType,
    config: input.config,
    enabled: true,
    emailEnabled: input.emailEnabled,
    createdAt: now,
    updatedAt: now,
  };

  store.alerts.push(created);
  return { ...created };
}

export function getAlertById(userId: string, alertId: number): Alert | null {
  const store = getStore();
  const alert = store.alerts.find((item) => item.userId === userId && item.id === alertId);
  return alert ? { ...alert } : null;
}

export function updateAlert(
  userId: string,
  alertId: number,
  updates: { config?: Record<string, unknown>; enabled?: boolean; emailEnabled?: boolean }
): Alert | null {
  const store = getStore();
  const alert = store.alerts.find((item) => item.userId === userId && item.id === alertId);
  if (!alert) return null;

  if (updates.config !== undefined) alert.config = updates.config;
  if (updates.enabled !== undefined) alert.enabled = updates.enabled;
  if (updates.emailEnabled !== undefined) alert.emailEnabled = updates.emailEnabled;
  alert.updatedAt = nowIso();

  return { ...alert };
}

export function deleteAlert(userId: string, alertId: number): boolean {
  const store = getStore();
  const index = store.alerts.findIndex((item) => item.userId === userId && item.id === alertId);
  if (index === -1) return false;

  store.alerts.splice(index, 1);
  return true;
}
