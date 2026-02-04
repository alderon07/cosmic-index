"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ObjectTheme } from "@/lib/theme";

interface InfoTooltipProps {
  children: React.ReactNode;
  content: string;
  theme?: ObjectTheme;
}

// Pre-defined theme classes (Tailwind JIT needs static strings)
const THEME_CLASSES: Record<ObjectTheme, { underline: string; border: string }> = {
  exoplanets: {
    underline: "border-primary/40 hover:border-primary",
    border: "border-primary/30",
  },
  stars: {
    underline: "border-uranium-green/40 hover:border-uranium-green",
    border: "border-uranium-green/30",
  },
  "small-bodies": {
    underline: "border-secondary/40 hover:border-secondary",
    border: "border-secondary/30",
  },
  "close-approaches": {
    underline: "border-destructive/40 hover:border-destructive",
    border: "border-destructive/30",
  },
  fireballs: {
    underline: "border-radium-teal/40 hover:border-radium-teal",
    border: "border-radium-teal/30",
  },
  "space-weather": {
    underline: "border-aurora-violet/40 hover:border-aurora-violet",
    border: "border-aurora-violet/30",
  },
};

const DEFAULT_CLASSES = {
  underline: "border-muted-foreground/40 hover:border-muted-foreground",
  border: "border-border/50",
};

/**
 * Themed tooltip wrapper for explaining technical terms
 * Use sparingly - only for terms that genuinely need explanation
 */
export function InfoTooltip({ children, content, theme }: InfoTooltipProps) {
  const classes = theme ? THEME_CLASSES[theme] : DEFAULT_CLASSES;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help border-b border-dotted ${classes.underline} transition-colors`}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className={`max-w-xs ${classes.border}`}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

// Pre-defined tooltip content for common terms
export const TOOLTIP_CONTENT = {
  // Small Bodies / Close Approaches
  NEO: "Near-Earth Object: An asteroid or comet with an orbit that brings it within 1.3 AU of the Sun, meaning it can pass relatively close to Earth.",
  PHA: "Potentially Hazardous Asteroid: Objects larger than ~140m that can pass within 7.5 million km of Earth. This is an orbital classification, not a threat warning.",
  ABSOLUTE_MAGNITUDE_H: "Absolute magnitude (H): A measure of intrinsic brightness. Lower H = brighter = larger. H=22 ≈ 100-200m, H=25 ≈ 25-50m, H=28 ≈ 5-15m.",

  // Stars
  SPECTRAL_TYPE: "Spectral classification based on temperature and color. O (hottest, blue) → B → A → F → G (Sun-like, yellow) → K → M (coolest, red).",
  METALLICITY: "Metallicity [Fe/H]: The iron abundance relative to the Sun. Positive = more metals than Sun, negative = fewer. Affects planet formation.",
  SOLAR_MASS: "Solar masses (M☉): Mass relative to our Sun. 1 M☉ = 1.989 × 10³⁰ kg.",
  SOLAR_RADIUS: "Solar radii (R☉): Radius relative to our Sun. 1 R☉ = 696,340 km.",
  LUMINOSITY: "Luminosity in log scale relative to the Sun. log L☉ = 0 means same as Sun, +1 = 10× brighter, -1 = 10× dimmer.",
  GYR: "Gigayears: Billions of years. Our Sun is about 4.6 Gyr old.",
  V_MAGNITUDE: "V magnitude: Apparent brightness in visible light. Lower = brighter. The Sun is -26.7, full Moon -12.7, faintest naked-eye stars ~6.",

  // Distance
  PARSEC: "Parsec (pc): Astronomical distance unit. 1 pc = 3.26 light-years = 3.09 × 10¹³ km.",
  LIGHT_YEAR: "Light-year (ly): Distance light travels in one year. 1 ly = 9.46 × 10¹² km.",

  // Exoplanets
  EARTH_RADII: "Earth radii (R⊕): Size relative to Earth. 1 R⊕ = 6,371 km. Jupiter is about 11 R⊕.",
  EARTH_MASSES: "Earth masses (M⊕): Mass relative to Earth. 1 M⊕ = 5.97 × 10²⁴ kg. Jupiter is about 318 M⊕.",
  EQUILIBRIUM_TEMP: "Equilibrium temperature: Theoretical surface temperature based on stellar radiation, assuming no atmosphere. Actual temperature may vary.",
  DISCOVERY_METHOD: {
    Transit: "Transit: Planet detected by measuring the tiny dip in starlight when it passes in front of its star.",
    "Radial Velocity": "Radial Velocity: Planet detected by measuring the star's wobble caused by gravitational pull.",
    "Direct Imaging": "Direct Imaging: Planet photographed directly, usually young giant planets far from their stars.",
    Microlensing: "Microlensing: Planet detected via gravitational bending of light from a background star.",
    "Transit Timing Variations": "TTV: Additional planets detected by changes in the timing of a known transiting planet.",
  },

  // Coordinates
  RA_DEC: "Right Ascension (RA) and Declination (Dec): Celestial coordinates, like longitude and latitude for the sky.",
} as const;
