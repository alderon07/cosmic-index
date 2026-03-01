export const queryKeys = {
  exoplanets: (fetchKey: string) => ["objects", "exoplanets", fetchKey] as const,
  stars: (fetchKey: string) => ["objects", "stars", fetchKey] as const,
  smallBodies: (fetchKey: string) =>
    ["objects", "small-bodies", fetchKey] as const,
  closeApproaches: (fetchKey: string) =>
    ["events", "close-approaches", fetchKey] as const,
  fireballs: (fetchKey: string) => ["events", "fireballs", fetchKey] as const,
  spaceWeather: (fetchKey: string) =>
    ["events", "space-weather", fetchKey] as const,
  spaceWeatherNotifications: (fetchKey: string) =>
    ["events", "space-weather", "notifications", fetchKey] as const,
  savedObjects: (page = 1, limit = 100) =>
    ["user", "saved-objects", page, limit] as const,
  collections: () => ["user", "collections"] as const,
  collectionDetail: (collectionId: number, page = 1, limit = 24) =>
    ["user", "collection-detail", collectionId, page, limit] as const,
  savedObjectCollections: (savedObjectId: number) =>
    ["user", "saved-object-collections", savedObjectId] as const,
};
