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
};
