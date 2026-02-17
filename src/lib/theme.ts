// Centralized theme configuration for each object type

import {
  AnyCosmicObject,
  AnySpaceWeatherEvent,
  SpaceWeatherEventType,
  SpaceWeatherNotificationType,
  isExoplanet,
  isSmallBody,
  isStar,
} from "@/lib/types";

export type ObjectTheme =
  | "exoplanets"
  | "stars"
  | "small-bodies"
  | "close-approaches"
  | "fireballs"
  | "space-weather";
export type CardTone = "cosmic" | "neutral";

export const DEFAULT_CARD_TONE: CardTone = "cosmic";
export const ACCOUNT_CARD_TONE: CardTone = "neutral";
export const DETAIL_CARD_SURFACE_CLASS =
  "border-border/45 bg-card/95 shadow-[inset_0_1px_0_rgba(255,210,160,0.05)]";
export const DETAIL_ACCORDION_SURFACE_CLASS =
  "rounded-lg border border-border/45 bg-card/92 px-4 shadow-[inset_0_1px_0_rgba(255,210,160,0.05)]";

export interface ThemeConfig {
  // Text color for names, labels
  text: string;
  // Glow effect class
  glow: string;
  // Full class string for selected buttons (with !important overrides)
  selectedButton: string;
  // Badge classes
  badge: string;
  // Filter chip classes
  filterChip: string;
  filterChipHover: string;
  // Icon class
  icon: string;
  // Page header icon container
  iconContainer: string;
  // Sort select styling
  sortSelect: string;
  // Filter count badge
  filterBadge: string;
  // Sort order toggle button classes
  sortOrderBorder: string;
  sortOrderSelected: string;
  // Select item focus state
  selectItemFocus: string;
  // Link/button hover text (e.g. hover:text-primary)
  hoverText: string;
  // Card surface treatment for list/grid cards in this domain
  cardSurface: string;
  // Shared metric tile treatment for card internals
  metricSurface: string;
  // Footer row treatment for card internals
  footerSurface: string;
  // Timeline panel hover border treatment
  timelineHoverBorder: string;
}

export const THEMES: Record<ObjectTheme, ThemeConfig> = {
  exoplanets: {
    text: "text-primary",
    glow: "glow-orange",
    selectedButton: "", // Uses default variant
    badge: "",
    filterChip: "bg-primary/20 text-primary border-primary/30",
    filterChipHover: "hover:bg-primary/30",
    icon: "text-primary",
    iconContainer: "bg-primary/20",
    sortSelect:
      "border-primary/30 hover:border-primary/50 focus:ring-primary/50 focus:border-primary/60",
    filterBadge: "",
    sortOrderBorder: "border-primary/30",
    sortOrderSelected: "bg-primary/20 text-primary",
    selectItemFocus:
      "data-[highlighted]:bg-primary/20 data-[highlighted]:text-primary data-[highlighted]:[&_svg:not([class*='text-'])]:text-primary",
    hoverText: "hover:text-primary",
    cardSurface:
      "bg-card/95 border-border/50 [background-image:radial-gradient(circle_at_top_right,rgba(255,185,120,0.08),transparent_58%)]",
    metricSurface: "rounded-md border border-border/40 bg-black/15 px-2.5 py-2",
    footerSurface: "border-t border-border/30 pt-3",
    timelineHoverBorder: "hover:border-reactor-orange/35",
  },
  stars: {
    text: "text-uranium-green",
    glow: "glow-uranium",
    selectedButton:
      "!bg-uranium-green !text-void-black !border-uranium-green hover:!bg-uranium-green/90",
    badge: "border-uranium-green/50 text-uranium-green bg-uranium-green/10",
    filterChip:
      "bg-uranium-green/20 text-uranium-green border-uranium-green/30",
    filterChipHover: "hover:bg-uranium-green/30",
    icon: "text-uranium-green",
    iconContainer: "bg-uranium-green/20",
    sortSelect:
      "border-uranium-green/30 hover:border-uranium-green/50 focus:ring-uranium-green/50 focus:border-uranium-green/60",
    filterBadge: "border-uranium-green/50 text-uranium-green",
    sortOrderBorder: "border-uranium-green/30",
    sortOrderSelected: "bg-uranium-green/20 text-uranium-green",
    selectItemFocus:
      "data-[highlighted]:bg-uranium-green/20 data-[highlighted]:text-uranium-green data-[highlighted]:[&_svg:not([class*='text-'])]:text-uranium-green",
    hoverText: "hover:text-uranium-green",
    cardSurface:
      "bg-card/95 border-border/50 [background-image:radial-gradient(circle_at_top_right,rgba(181,255,87,0.1),transparent_58%)]",
    metricSurface: "rounded-md border border-border/40 bg-black/15 px-2.5 py-2",
    footerSurface: "border-t border-border/30 pt-3",
    timelineHoverBorder: "hover:border-uranium-green/40",
  },
  "small-bodies": {
    text: "text-secondary",
    glow: "glow-amber",
    selectedButton: "", // Uses secondary variant
    badge: "",
    filterChip: "bg-secondary/20 text-secondary border-secondary/30",
    filterChipHover: "hover:bg-secondary/30",
    icon: "text-secondary",
    iconContainer: "bg-secondary/20",
    sortSelect:
      "border-secondary/30 hover:border-secondary/50 focus:ring-secondary/50 focus:border-secondary/60",
    filterBadge: "border-secondary/50 text-secondary",
    sortOrderBorder: "border-secondary/30",
    sortOrderSelected: "bg-secondary/20 text-secondary",
    selectItemFocus:
      "data-[highlighted]:bg-secondary/20 data-[highlighted]:text-secondary data-[highlighted]:[&_svg:not([class*='text-'])]:text-secondary",
    hoverText: "hover:text-secondary",
    cardSurface:
      "bg-card/95 border-border/50 [background-image:radial-gradient(circle_at_top_right,rgba(255,182,39,0.1),transparent_58%)]",
    metricSurface: "rounded-md border border-border/40 bg-black/15 px-2.5 py-2",
    footerSurface: "border-t border-border/30 pt-3",
    timelineHoverBorder: "hover:border-secondary/40",
  },
  "close-approaches": {
    text: "text-destructive",
    glow: "glow-red",
    selectedButton:
      "!bg-destructive !text-destructive-foreground !border-destructive hover:!bg-destructive/90",
    badge: "border-destructive/50 text-destructive bg-destructive/10",
    filterChip: "bg-destructive/20 text-destructive border-destructive/30",
    filterChipHover: "hover:bg-destructive/30",
    icon: "text-destructive",
    iconContainer: "bg-destructive/20",
    sortSelect:
      "border-destructive/30 hover:border-destructive/50 focus:ring-destructive/50 focus:border-destructive/60",
    filterBadge: "border-destructive/50 text-destructive",
    sortOrderBorder: "border-destructive/30",
    sortOrderSelected: "bg-destructive/20 text-destructive",
    selectItemFocus:
      "data-[highlighted]:bg-destructive/20 data-[highlighted]:text-destructive data-[highlighted]:[&_svg:not([class*='text-'])]:text-destructive",
    hoverText: "hover:text-destructive",
    cardSurface:
      "bg-card/95 border-border/50 [background-image:radial-gradient(circle_at_top_right,rgba(255,80,80,0.08),transparent_58%)]",
    metricSurface: "rounded-md border border-border/40 bg-black/15 px-2.5 py-2",
    footerSurface: "border-t border-border/30 pt-3",
    timelineHoverBorder: "hover:border-destructive/40",
  },
  fireballs: {
    text: "text-radium-teal",
    glow: "glow-teal",
    selectedButton:
      "!bg-radium-teal !text-void-black !border-radium-teal hover:!bg-radium-teal/90",
    badge: "border-radium-teal/50 text-radium-teal bg-radium-teal/10",
    filterChip: "bg-radium-teal/20 text-radium-teal border-radium-teal/30",
    filterChipHover: "hover:bg-radium-teal/30",
    icon: "text-radium-teal",
    iconContainer: "bg-radium-teal/20",
    sortSelect:
      "border-radium-teal/30 hover:border-radium-teal/50 focus:ring-radium-teal/50 focus:border-radium-teal/60",
    filterBadge: "border-radium-teal/50 text-radium-teal",
    sortOrderBorder: "border-radium-teal/30",
    sortOrderSelected: "bg-radium-teal/20 text-radium-teal",
    selectItemFocus:
      "data-[highlighted]:bg-radium-teal/20 data-[highlighted]:text-radium-teal data-[highlighted]:[&_svg:not([class*='text-'])]:text-radium-teal",
    hoverText: "hover:text-radium-teal",
    cardSurface:
      "bg-card/95 border-border/50 [background-image:radial-gradient(circle_at_top_right,rgba(61,219,217,0.09),transparent_58%)]",
    metricSurface: "rounded-md border border-border/40 bg-black/15 px-2.5 py-2",
    footerSurface: "border-t border-border/30 pt-3",
    timelineHoverBorder: "hover:border-radium-teal/40",
  },
  "space-weather": {
    text: "text-aurora-violet",
    glow: "glow-violet",
    selectedButton:
      "!bg-aurora-violet !text-void-black !border-aurora-violet hover:!bg-aurora-violet/90",
    badge: "border-aurora-violet/50 text-aurora-violet bg-aurora-violet/10",
    filterChip:
      "bg-aurora-violet/20 text-aurora-violet border-aurora-violet/30",
    filterChipHover: "hover:bg-aurora-violet/30",
    icon: "text-aurora-violet",
    iconContainer: "bg-aurora-violet/20",
    sortSelect:
      "border-aurora-violet/30 hover:border-aurora-violet/50 focus:ring-aurora-violet/50 focus:border-aurora-violet/60",
    filterBadge: "border-aurora-violet/50 text-aurora-violet",
    sortOrderBorder: "border-aurora-violet/30",
    sortOrderSelected: "bg-aurora-violet/20 text-aurora-violet",
    selectItemFocus:
      "data-[highlighted]:bg-aurora-violet/20 data-[highlighted]:text-aurora-violet data-[highlighted]:[&_svg:not([class*='text-'])]:text-aurora-violet",
    hoverText: "hover:text-aurora-violet",
    cardSurface:
      "bg-card/95 border-border/50 [background-image:radial-gradient(circle_at_top_right,rgba(178,102,255,0.12),transparent_58%)]",
    metricSurface: "rounded-md border border-border/40 bg-black/15 px-2.5 py-2",
    footerSurface: "border-t border-border/30 pt-3",
    timelineHoverBorder: "hover:border-aurora-violet/40",
  },
};

// Special theme for comets (subset of small-bodies)
export const COMET_THEME = {
  selectedButton:
    "!bg-radium-teal !text-void-black !border-radium-teal hover:!bg-radium-teal/90",
};

export type DetailAccentTheme = "exoplanets" | "stars" | "small-bodies" | "comet";

export interface DetailAccentConfig {
  heroGlow: string;
  heroBadge: string;
  heroIconAccent: string;
  linkHover: string;
  compareOutline: string;
  compareActive: string;
}

export const DETAIL_THEME_ACCENTS: Record<DetailAccentTheme, DetailAccentConfig> = {
  exoplanets: {
    heroGlow: "bg-primary/10",
    heroBadge: "border-primary/45 text-primary bg-primary/10",
    heroIconAccent: "text-primary",
    linkHover: "hover:text-primary",
    compareOutline:
      "border-primary/30 bg-primary/5 text-primary/85 hover:bg-primary/10 hover:text-primary",
    compareActive: "border-primary/55 bg-primary/15 text-primary hover:bg-primary/20",
  },
  stars: {
    heroGlow: "bg-uranium-green/10",
    heroBadge: "border-uranium-green/50 text-uranium-green bg-uranium-green/10",
    heroIconAccent: "text-uranium-green",
    linkHover: "hover:text-uranium-green",
    compareOutline:
      "border-uranium-green/30 bg-uranium-green/5 text-uranium-green/85 hover:bg-uranium-green/10 hover:text-uranium-green",
    compareActive:
      "border-uranium-green/55 bg-uranium-green/15 text-uranium-green hover:bg-uranium-green/20",
  },
  "small-bodies": {
    heroGlow: "bg-secondary/10",
    heroBadge: "border-secondary/45 text-secondary bg-secondary/10",
    heroIconAccent: "text-secondary",
    linkHover: "hover:text-secondary",
    compareOutline:
      "border-secondary/30 bg-secondary/5 text-secondary/85 hover:bg-secondary/10 hover:text-secondary",
    compareActive:
      "border-secondary/55 bg-secondary/15 text-secondary hover:bg-secondary/20",
  },
  comet: {
    heroGlow: "bg-radium-teal/10",
    heroBadge: "border-radium-teal/50 text-radium-teal bg-radium-teal/10",
    heroIconAccent: "text-radium-teal",
    linkHover: "hover:text-radium-teal",
    compareOutline:
      "border-radium-teal/30 bg-radium-teal/5 text-radium-teal/85 hover:bg-radium-teal/10 hover:text-radium-teal",
    compareActive:
      "border-radium-teal/55 bg-radium-teal/15 text-radium-teal hover:bg-radium-teal/20",
  },
};

export function resolveDetailAccentTheme(object: AnyCosmicObject): DetailAccentTheme {
  if (isExoplanet(object)) return "exoplanets";
  if (isStar(object)) return "stars";
  if (isSmallBody(object) && object.bodyKind === "comet") return "comet";
  return "small-bodies";
}

export function getDetailAccentConfig(object: AnyCosmicObject): DetailAccentConfig {
  return DETAIL_THEME_ACCENTS[resolveDetailAccentTheme(object)];
}

export type SpaceWeatherEventTheme = AnySpaceWeatherEvent["eventType"];

export interface SpaceWeatherDetailAccentConfig {
  heroGlow: string;
  eventIcon: string;
  metricAccent: string;
  actionHover: string;
  linkedCardHover: string;
  linkedTitleHover: string;
  linkedIconHover: string;
}

export const SPACE_WEATHER_DETAIL_ACCENTS: Record<
  SpaceWeatherEventTheme,
  SpaceWeatherDetailAccentConfig
> = {
  FLR: {
    heroGlow: "bg-aurora-violet/14",
    eventIcon: "text-aurora-violet",
    metricAccent: "text-aurora-violet",
    actionHover: "hover:text-aurora-violet",
    linkedCardHover: "hover:border-aurora-violet/50 hover:bg-aurora-violet/5",
    linkedTitleHover: "group-hover:text-aurora-violet",
    linkedIconHover: "group-hover:text-aurora-violet",
  },
  CME: {
    heroGlow: "bg-aurora-violet/14",
    eventIcon: "text-aurora-violet",
    metricAccent: "text-aurora-violet",
    actionHover: "hover:text-aurora-violet",
    linkedCardHover: "hover:border-aurora-violet/50 hover:bg-aurora-violet/5",
    linkedTitleHover: "group-hover:text-aurora-violet",
    linkedIconHover: "group-hover:text-aurora-violet",
  },
  GST: {
    heroGlow: "bg-aurora-violet/14",
    eventIcon: "text-aurora-violet",
    metricAccent: "text-aurora-violet",
    actionHover: "hover:text-aurora-violet",
    linkedCardHover: "hover:border-aurora-violet/50 hover:bg-aurora-violet/5",
    linkedTitleHover: "group-hover:text-aurora-violet",
    linkedIconHover: "group-hover:text-aurora-violet",
  },
  IPS: {
    heroGlow: "bg-aurora-violet/14",
    eventIcon: "text-aurora-violet",
    metricAccent: "text-aurora-violet",
    actionHover: "hover:text-aurora-violet",
    linkedCardHover: "hover:border-aurora-violet/50 hover:bg-aurora-violet/5",
    linkedTitleHover: "group-hover:text-aurora-violet",
    linkedIconHover: "group-hover:text-aurora-violet",
  },
  HSS: {
    heroGlow: "bg-aurora-violet/14",
    eventIcon: "text-aurora-violet",
    metricAccent: "text-aurora-violet",
    actionHover: "hover:text-aurora-violet",
    linkedCardHover: "hover:border-aurora-violet/50 hover:bg-aurora-violet/5",
    linkedTitleHover: "group-hover:text-aurora-violet",
    linkedIconHover: "group-hover:text-aurora-violet",
  },
  SEP: {
    heroGlow: "bg-aurora-violet/14",
    eventIcon: "text-aurora-violet",
    metricAccent: "text-aurora-violet",
    actionHover: "hover:text-aurora-violet",
    linkedCardHover: "hover:border-aurora-violet/50 hover:bg-aurora-violet/5",
    linkedTitleHover: "group-hover:text-aurora-violet",
    linkedIconHover: "group-hover:text-aurora-violet",
  },
};

export function getSpaceWeatherDetailAccent(
  eventType: SpaceWeatherEventTheme
): SpaceWeatherDetailAccentConfig {
  return SPACE_WEATHER_DETAIL_ACCENTS[eventType];
}

export const SPACE_WEATHER_EVENT_LABELS: Record<SpaceWeatherEventType, string> = {
  FLR: "Solar Flares",
  CME: "CMEs",
  GST: "Geomagnetic Storms",
  IPS: "Interplanetary Shocks",
  HSS: "High-Speed Streams",
  SEP: "Solar Energetic Particles",
};

export const SPACE_WEATHER_EVENT_BREAKDOWN_LABELS: Record<
  SpaceWeatherEventType,
  string
> = {
  FLR: "flares",
  CME: "CMEs",
  GST: "storms",
  IPS: "shocks",
  HSS: "streams",
  SEP: "SEP events",
};

export const SPACE_WEATHER_SEVERITY_BADGE_CLASSES: Record<string, string> = {
  minor: "border-muted-foreground/50 text-muted-foreground bg-muted/10",
  moderate: "border-yellow-500/50 text-yellow-500 bg-yellow-500/10",
  strong: "border-amber-500/50 text-amber-500 bg-amber-500/10",
  severe: "border-orange-500/50 text-orange-500 bg-orange-500/10",
  extreme: "border-red-500/50 text-red-500 bg-red-500/10",
};

export const SPACE_WEATHER_SEVERITY_TEXT_CLASSES: Record<string, string> = {
  minor: "text-muted-foreground",
  moderate: "text-yellow-500",
  strong: "text-amber-500",
  severe: "text-orange-500",
  extreme: "text-red-500",
};

export const SPACE_WEATHER_NOTIFICATION_BADGES: Record<
  SpaceWeatherNotificationType,
  string
> = {
  all: "border-aurora-violet/40 text-aurora-violet bg-aurora-violet/10",
  FLR: "border-aurora-violet/40 text-aurora-violet bg-aurora-violet/10",
  CME: "border-aurora-violet/40 text-aurora-violet bg-aurora-violet/10",
  GST: "border-aurora-violet/40 text-aurora-violet bg-aurora-violet/10",
  IPS: "border-aurora-violet/40 text-aurora-violet bg-aurora-violet/10",
  SEP: "border-aurora-violet/40 text-aurora-violet bg-aurora-violet/10",
  other: "border-muted-foreground/40 text-muted-foreground bg-muted/10",
};
