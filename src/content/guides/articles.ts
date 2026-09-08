import type { GuideSlug } from "../guide-index";
import { comparingExoplanets } from "./comparing-exoplanets";
import { readingSpaceWeather } from "./reading-space-weather";
import { understandingAsteroidFlybys } from "./understanding-asteroid-flybys";
import type { GuideArticle } from "./types";
import { trappistComparison } from "./trappist-1-comparison";
import { asteroid2023BuCloseApproach } from "./2023-bu-close-approach";
import { may2024GeomagneticStorm } from "./may-2024-geomagnetic-storm";

export const GUIDE_ARTICLES: Record<GuideSlug, GuideArticle> = {
  "trappist-1-comparison": trappistComparison,
  "comparing-exoplanets": comparingExoplanets,
  "reading-space-weather": readingSpaceWeather,
  "understanding-asteroid-flybys": understandingAsteroidFlybys,
  "2023-bu-close-approach": asteroid2023BuCloseApproach,
  "may-2024-geomagnetic-storm": may2024GeomagneticStorm,
};
