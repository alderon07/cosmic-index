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
  spaceWeatherOverview: (fetchKey: string) =>
    ["events", "space-weather", "overview", fetchKey] as const,
  spaceWeatherSolarSuvi: (fetchKey: string) =>
    ["events", "space-weather", "solar", "suvi", fetchKey] as const,
  spaceWeatherSolarDrap: (fetchKey: string) =>
    ["events", "space-weather", "solar", "drap", fetchKey] as const,
  spaceWeatherSolarFlareForecast: (fetchKey: string) =>
    ["events", "space-weather", "solar", "flare-forecast", fetchKey] as const,
  spaceWeatherSolarWind: (fetchKey: string) =>
    ["events", "space-weather", "solar-wind", fetchKey] as const,
  spaceWeatherGeomagneticHp30: (fetchKey: string) =>
    ["events", "space-weather", "geomagnetic", "hp30", fetchKey] as const,
  spaceWeatherGeomagneticAe: (fetchKey: string) =>
    ["events", "space-weather", "geomagnetic", "ae", fetchKey] as const,
  savedObjects: (limit = 100) =>
    ["user", "saved-objects", "cursor", limit] as const,
  collections: () => ["user", "collections", "cursor"] as const,
  collectionDetail: (collectionId: number, limit = 24) =>
    ["user", "collection-detail", collectionId, "cursor", limit] as const,
  savedObjectCollections: (savedObjectId: number) =>
    ["user", "saved-object-collections", savedObjectId] as const,
};
