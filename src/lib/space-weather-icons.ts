import type { LucideIcon } from "lucide-react";
import { Cloud, Flame, Magnet, Radiation, Waves, Wind } from "lucide-react";
import type { SpaceWeatherEventType } from "@/lib/types";

export const SPACE_WEATHER_EVENT_ICONS: Record<SpaceWeatherEventType, LucideIcon> = {
  FLR: Flame,
  CME: Cloud,
  GST: Magnet,
  IPS: Waves,
  HSS: Wind,
  SEP: Radiation,
};
