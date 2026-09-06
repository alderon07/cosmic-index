import type { GuideSlug } from "../guide-index";
import { comparingExoplanets } from "./comparing-exoplanets";
import { readingSpaceWeather } from "./reading-space-weather";
import { understandingAsteroidFlybys } from "./understanding-asteroid-flybys";
import type { GuideArticle } from "./types";

export const GUIDE_ARTICLES: Record<GuideSlug, GuideArticle> = {
  "comparing-exoplanets": comparingExoplanets,
  "reading-space-weather": readingSpaceWeather,
  "understanding-asteroid-flybys": understandingAsteroidFlybys,
};
