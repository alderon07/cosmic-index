// Centralized theme configuration for each object type

export type ObjectTheme = "exoplanets" | "stars" | "small-bodies" | "close-approaches" | "fireballs" | "space-weather";

export interface ThemeConfig {
  // Raw color name (for documentation)
  colorName: string;
  // Text color for names, labels
  text: string;
  // Background color for badges, buttons when selected
  bg: string;
  // Border color
  border: string;
  // Hover background
  hoverBg: string;
  // Foreground text on colored background
  textOnBg: string;
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
  // Focus ring
  focusRing: string;
  // Sort order toggle button classes
  sortOrderBorder: string;
  sortOrderSelected: string;
  // Select item focus state
  selectItemFocus: string;
  // Link/button hover text (e.g. hover:text-primary)
  hoverText: string;
}

export const THEMES: Record<ObjectTheme, ThemeConfig> = {
  exoplanets: {
    colorName: "primary",
    text: "text-primary",
    bg: "bg-primary",
    border: "border-primary",
    hoverBg: "hover:bg-primary/90",
    textOnBg: "text-primary-foreground",
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
    focusRing: "focus:ring-primary",
    sortOrderBorder: "border-primary/30",
    sortOrderSelected: "bg-primary/20 text-primary",
    selectItemFocus: "focus:bg-primary/20 focus:text-primary",
    hoverText: "hover:text-primary",
  },
  stars: {
    colorName: "uranium-green",
    text: "text-uranium-green",
    bg: "bg-uranium-green",
    border: "border-uranium-green",
    hoverBg: "hover:bg-uranium-green/90",
    textOnBg: "text-void-black",
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
    focusRing: "focus:ring-uranium-green",
    sortOrderBorder: "border-uranium-green/30",
    sortOrderSelected: "bg-uranium-green/20 text-uranium-green",
    selectItemFocus: "focus:bg-uranium-green/20 focus:text-uranium-green",
    hoverText: "hover:text-uranium-green",
  },
  "small-bodies": {
    colorName: "secondary",
    text: "text-secondary",
    bg: "bg-secondary",
    border: "border-secondary",
    hoverBg: "hover:bg-secondary/90",
    textOnBg: "text-secondary-foreground",
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
    focusRing: "focus:ring-secondary",
    sortOrderBorder: "border-secondary/30",
    sortOrderSelected: "bg-secondary/20 text-secondary",
    selectItemFocus: "focus:bg-secondary/20 focus:text-secondary",
    hoverText: "hover:text-secondary",
  },
  "close-approaches": {
    colorName: "destructive",
    text: "text-destructive",
    bg: "bg-destructive",
    border: "border-destructive",
    hoverBg: "hover:bg-destructive/90",
    textOnBg: "text-destructive-foreground",
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
    focusRing: "focus:ring-destructive",
    sortOrderBorder: "border-destructive/30",
    sortOrderSelected: "bg-destructive/20 text-destructive",
    selectItemFocus: "focus:bg-destructive/20 focus:text-destructive",
    hoverText: "hover:text-destructive",
  },
  fireballs: {
    colorName: "radium-teal",
    text: "text-radium-teal",
    bg: "bg-radium-teal",
    border: "border-radium-teal",
    hoverBg: "hover:bg-radium-teal/90",
    textOnBg: "text-void-black",
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
    focusRing: "focus:ring-radium-teal",
    sortOrderBorder: "border-radium-teal/30",
    sortOrderSelected: "bg-radium-teal/20 text-radium-teal",
    selectItemFocus: "focus:bg-radium-teal/20 focus:text-radium-teal",
    hoverText: "hover:text-radium-teal",
  },
  "space-weather": {
    colorName: "aurora-violet",
    text: "text-aurora-violet",
    bg: "bg-aurora-violet",
    border: "border-aurora-violet",
    hoverBg: "hover:bg-aurora-violet/90",
    textOnBg: "text-void-black",
    glow: "glow-violet",
    selectedButton:
      "!bg-aurora-violet !text-void-black !border-aurora-violet hover:!bg-aurora-violet/90",
    badge: "border-aurora-violet/50 text-aurora-violet bg-aurora-violet/10",
    filterChip: "bg-aurora-violet/20 text-aurora-violet border-aurora-violet/30",
    filterChipHover: "hover:bg-aurora-violet/30",
    icon: "text-aurora-violet",
    iconContainer: "bg-aurora-violet/20",
    sortSelect:
      "border-aurora-violet/30 hover:border-aurora-violet/50 focus:ring-aurora-violet/50 focus:border-aurora-violet/60",
    filterBadge: "border-aurora-violet/50 text-aurora-violet",
    focusRing: "focus:ring-aurora-violet",
    sortOrderBorder: "border-aurora-violet/30",
    sortOrderSelected: "bg-aurora-violet/20 text-aurora-violet",
    selectItemFocus: "focus:bg-aurora-violet/20 focus:text-aurora-violet",
    hoverText: "hover:text-aurora-violet",
  },
};

// Special theme for comets (subset of small-bodies)
export const COMET_THEME = {
  text: "text-radium-teal",
  bg: "bg-radium-teal",
  border: "border-radium-teal",
  hoverBg: "hover:bg-radium-teal/90",
  textOnBg: "text-void-black",
  glow: "glow-teal",
  selectedButton:
    "!bg-radium-teal !text-void-black !border-radium-teal hover:!bg-radium-teal/90",
  badge: "border-radium-teal/50 text-radium-teal bg-radium-teal/10",
};

// Helper to get theme by object type
export function getTheme(type: ObjectTheme): ThemeConfig {
  return THEMES[type];
}
