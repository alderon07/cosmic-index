// Centralized theme configuration for each object type

import {
  AnyCosmicObject,
  AnySpaceWeatherEvent,
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
  },
  "space-weather": {
    text: "text-primary",
    glow: "glow-orange",
    selectedButton:
      "!bg-primary !text-primary-foreground !border-primary hover:!bg-primary/90",
    badge: "border-primary/50 text-primary bg-primary/10",
    filterChip: "bg-primary/20 text-primary border-primary/30",
    filterChipHover: "hover:bg-primary/30",
    icon: "text-primary",
    iconContainer: "bg-primary/20",
    sortSelect:
      "border-primary/30 hover:border-primary/50 focus:ring-primary/50 focus:border-primary/60",
    filterBadge: "border-primary/50 text-primary",
    sortOrderBorder: "border-primary/30",
    sortOrderSelected: "bg-primary/20 text-primary",
    selectItemFocus:
      "data-[highlighted]:bg-primary/20 data-[highlighted]:text-primary data-[highlighted]:[&_svg:not([class*='text-'])]:text-primary",
    hoverText: "hover:text-primary",
    cardSurface:
      "bg-card/95 border-border/50 [background-image:radial-gradient(circle_at_top_right,rgba(255,185,120,0.1),transparent_58%)]",
    metricSurface: "rounded-md border border-border/40 bg-black/15 px-2.5 py-2",
    footerSurface: "border-t border-border/30 pt-3",
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
    heroGlow: "bg-primary/14",
    eventIcon: "text-primary",
    metricAccent: "text-primary",
    actionHover: "hover:text-primary",
    linkedCardHover: "hover:border-primary/50 hover:bg-primary/5",
    linkedTitleHover: "group-hover:text-primary",
    linkedIconHover: "group-hover:text-primary",
  },
  CME: {
    heroGlow: "bg-primary/14",
    eventIcon: "text-primary",
    metricAccent: "text-primary",
    actionHover: "hover:text-primary",
    linkedCardHover: "hover:border-primary/50 hover:bg-primary/5",
    linkedTitleHover: "group-hover:text-primary",
    linkedIconHover: "group-hover:text-primary",
  },
  GST: {
    heroGlow: "bg-primary/14",
    eventIcon: "text-primary",
    metricAccent: "text-primary",
    actionHover: "hover:text-primary",
    linkedCardHover: "hover:border-primary/50 hover:bg-primary/5",
    linkedTitleHover: "group-hover:text-primary",
    linkedIconHover: "group-hover:text-primary",
  },
};

export function getSpaceWeatherDetailAccent(
  eventType: SpaceWeatherEventTheme
): SpaceWeatherDetailAccentConfig {
  return SPACE_WEATHER_DETAIL_ACCENTS[eventType];
}
