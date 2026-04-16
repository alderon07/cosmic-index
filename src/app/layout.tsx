import type { Metadata } from "next";
import { Audiowide, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import {
  Circle,
  Star,
  CircleDot,
  Crosshair,
  Flame,
  CloudLightning,
  Keyboard,
  Activity,
  ShieldAlert,
  Sun,
  Waves,
  Wind,
} from "lucide-react";
import { THEMES } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/react";
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts/keyboard-shortcuts-provider";
import { UserAuthButton } from "@/components/auth/user-auth-button";
import { CompareProvider } from "@/components/compare/compare-provider";
import { CompareTray } from "@/components/compare/compare-tray";
import { AppAuthProvider } from "@/components/auth/app-auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { serializeJsonLd } from "@/lib/safe-json-ld";

const audiowide = Audiowide({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Cosmic Index - Explore Exoplanets, Stars & Small Bodies",
    template: "%s | Cosmic Index",
  },
  description:
    "A retrofuturistic space encyclopedia for discovering exoplanets, host stars, asteroids, and comets. Explore 5,000+ exoplanets, 4,500+ host stars, and 1,000,000+ small bodies with data from NASA and JPL.",
  keywords: [
    "exoplanets",
    "stars",
    "host stars",
    "asteroids",
    "comets",
    "space",
    "NASA",
    "astronomy",
    "space exploration",
    "near-earth objects",
    "NEO",
    "planetary science",
    "spectral class",
  ],
  authors: [{ name: "Cosmic Index" }],
  creator: "Cosmic Index",
  publisher: "Cosmic Index",
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Cosmic Index",
    title: "Cosmic Index - Explore Exoplanets, Stars & Small Bodies",
    description:
      "A retrofuturistic space encyclopedia for discovering exoplanets, host stars, asteroids, and comets. Powered by NASA and JPL data.",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cosmic Index - Space Encyclopedia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cosmic Index - Explore Exoplanets, Stars & Small Bodies",
    description:
      "A retrofuturistic space encyclopedia for discovering exoplanets, host stars, asteroids, and comets. Powered by NASA and JPL data.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

// JSON-LD WebSite schema with SearchAction
// This is static content we control, not user input, so it's safe
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Cosmic Index",
  url: BASE_URL,
  description:
    "A retrofuturistic space encyclopedia for discovering exoplanets, host stars, asteroids, and comets. Explore 5,000+ exoplanets, 4,500+ host stars, and 1,000,000+ small bodies with data from NASA and JPL.",
  potentialAction: [
    {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/exoplanets?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/stars?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/small-bodies?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
      </head>
      <body
        className={`${audiowide.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background flex flex-col`}
      >
        <QueryProvider>
        <AppAuthProvider>
        <CompareProvider>
        <KeyboardShortcutsProvider>
        <div className="relative vignette flex min-h-screen flex-1 flex-col">
          {/* Navigation */}
          <header className="sticky top-0 z-50 border-b border-orange-200/20 bg-[#120d0a]/90 backdrop-blur-md">
            <nav className="shell-container flex h-16 min-w-0 items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-full border border-orange-300/35 reactor-gradient pulse-glow" />
                <span className="hidden lg:inline font-display text-xl tracking-wider text-orange-100 transition-colors group-hover:text-orange-300">
                  Cosmic Index
                </span>
              </Link>
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 lg:gap-6">
                <Link
                  href="/exoplanets"
                  className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors ${THEMES.exoplanets.hoverText}`}
                  title="Exoplanets"
                >
                  <Circle className="w-5 h-5 lg:hidden" />
                  <span className="hidden lg:inline">Exoplanets</span>
                </Link>
                <Link
                  href="/stars"
                  className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors ${THEMES.stars.hoverText}`}
                  title="Stars"
                >
                  <Star className="w-5 h-5 lg:hidden" />
                  <span className="hidden lg:inline">Stars</span>
                </Link>
                <Link
                  href="/small-bodies"
                  className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors lg:hidden ${THEMES["small-bodies"].hoverText}`}
                  title="Small Bodies"
                >
                  <CircleDot className="w-5 h-5" />
                  <span className="hidden lg:inline">Small-Bodies</span>
                </Link>
                <NavigationMenu
                  viewport={false}
                  className="hidden lg:flex"
                >
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger
                        className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors ${THEMES["small-bodies"].hoverText} bg-transparent p-0 h-auto hover:!bg-transparent hover:!text-secondary focus:!bg-transparent focus:!text-secondary focus-visible:!text-secondary data-[state=open]:!bg-transparent data-[state=open]:!text-secondary data-[state=closed]:text-orange-100/75`}
                      >
                        Small-Bodies
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="!top-full !right-0 !left-auto !mt-2.5 !w-[min(31rem,calc(100vw-2rem))] rounded-lg border border-border/50 bg-[#160f0b]/97 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md">
                        <ul className="grid grid-cols-2 gap-2">
                          <li>
                            <NavigationMenuLink
                              className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                              asChild
                            >
                              <Link
                                href="/small-bodies"
                                className="group flex h-full flex-col justify-start rounded-md border border-secondary/25 bg-secondary/6 text-left transition-colors hover:border-secondary/45 hover:bg-secondary/10"
                              >
                                <div className="px-4 py-3.5">
                                  <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-secondary">
                                    <CircleDot className="w-4 h-4 shrink-0" />
                                    <span className="font-display text-[0.82rem] tracking-wide">Small Bodies</span>
                                  </div>
                                  <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-secondary/75">
                                    Browse asteroid and comet records with search, filtering, and direct paths into detail pages.
                                  </p>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                              asChild
                            >
                              <Link
                                href="/close-approaches"
                                className="group flex h-full flex-col justify-start rounded-md border border-border/40 bg-card/50 text-left transition-colors hover:border-destructive/35 hover:bg-destructive/8"
                              >
                                <div className="px-4 py-3.5">
                                  <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-destructive">
                                    <Crosshair className="w-4 h-4 shrink-0" />
                                    <span className="font-display text-[0.82rem] tracking-wide">Close Approaches</span>
                                  </div>
                                  <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-destructive/75">
                                    Upcoming NEO flyby events near Earth with distance and velocity.
                                  </p>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                              asChild
                            >
                              <Link
                                href="/fireballs"
                                className="group flex h-full flex-col justify-start rounded-md border border-border/40 bg-card/50 text-left transition-colors hover:border-radium-teal/35 hover:bg-radium-teal/8"
                              >
                                <div className="px-4 py-3.5">
                                  <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-radium-teal">
                                    <Flame className="w-4 h-4 shrink-0" />
                                    <span className="font-display text-[0.82rem] tracking-wide">Fireballs</span>
                                  </div>
                                  <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-radium-teal/75">
                                    Review reported atmospheric fireball events with energy, speed, and impact context.
                                  </p>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </NavigationMenuContent>
                      </NavigationMenuItem>
                    </NavigationMenuList>
                  </NavigationMenu>
                <Link
                  href="/close-approaches"
                  className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors lg:hidden ${THEMES["close-approaches"].hoverText}`}
                  title="Close Approaches"
                >
                  <Crosshair className="w-5 h-5" />
                  <span className="hidden lg:inline">Close-Approaches</span>
                </Link>
                <Link
                  href="/fireballs"
                  className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors lg:hidden ${THEMES.fireballs.hoverText}`}
                  title="Fireballs"
                >
                  <Flame className="w-5 h-5 lg:hidden" />
                  <span className="hidden lg:inline">Fireballs</span>
                </Link>
                <Link
                  href="/space-weather"
                  className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors lg:hidden ${THEMES["space-weather"].hoverText}`}
                  title="Space Weather"
                >
                  <CloudLightning className="w-5 h-5" />
                  <span className="hidden lg:inline">Weather</span>
                </Link>
                <NavigationMenu viewport={false} className="hidden lg:flex">
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger
                        className={`font-display text-sm tracking-wide text-orange-100/75 transition-colors ${THEMES["space-weather"].hoverText} bg-transparent p-0 h-auto hover:!bg-transparent hover:!text-aurora-violet focus:!bg-transparent focus:!text-aurora-violet focus-visible:!text-aurora-violet data-[state=open]:!bg-transparent data-[state=open]:!text-aurora-violet data-[state=closed]:text-orange-100/75`}
                      >
                        Weather
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="!top-full !left-0 !mt-2.5 !flex !w-full !min-w-0 !justify-center !border-0 !bg-transparent !p-0 !shadow-none">
                        <div className="w-[min(31rem,calc(100vw-2rem))] rounded-lg border border-border/50 bg-[#160f0b]/97 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md">
                          <ul className="grid grid-cols-2 gap-2">
                            <li className="col-span-2">
                              <NavigationMenuLink
                                className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                                asChild
                              >
                                <Link
                                  href="/space-weather"
                                  className="group flex h-full flex-col justify-start rounded-md border border-aurora-violet/25 bg-aurora-violet/6 text-left transition-colors hover:border-aurora-violet/45 hover:bg-aurora-violet/10"
                                >
                                  <div className="px-4 py-3.5">
                                    <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-aurora-violet">
                                      <CloudLightning className="w-4 h-4 shrink-0" />
                                      <span className="font-display text-[0.82rem] tracking-wide">Space Weather Observatory</span>
                                    </div>
                                    <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-aurora-violet/80">
                                      Hub overview for live monitoring, educational context, and quick access to alerts, solar, geomagnetic, and event views.
                                    </p>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                            <li>
                              <NavigationMenuLink
                                className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                                asChild
                              >
                                <Link
                                  href="/space-weather/events"
                                  className="group flex h-full flex-col justify-start rounded-md border border-border/40 bg-card/50 text-left transition-colors hover:border-aurora-violet/35 hover:bg-aurora-violet/8"
                                >
                                  <div className="px-4 py-3.5">
                                    <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-aurora-violet">
                                      <Activity className="w-4 h-4 shrink-0" />
                                      <span className="font-display text-[0.82rem] tracking-wide">DONKI Events</span>
                                    </div>
                                    <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-aurora-violet/75">
                                      Browse NASA event reports across flares, CMEs, geomagnetic storms, and more.
                                    </p>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                            <li>
                              <NavigationMenuLink
                                className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                                asChild
                              >
                                <Link
                                  href="/space-weather/solar-wind"
                                  className="group flex h-full flex-col justify-start rounded-md border border-border/40 bg-card/50 text-left transition-colors hover:border-violet-300/35 hover:bg-violet-300/8"
                                >
                                  <div className="px-4 py-3.5">
                                    <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-violet-300">
                                      <Wind className="w-4 h-4 shrink-0" />
                                      <span className="font-display text-[0.82rem] tracking-wide">Solar Wind</span>
                                    </div>
                                    <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-violet-300/75">
                                      Watch upstream plasma flow and IMF orientation before it couples into Earth&apos;s magnetosphere.
                                    </p>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                            <li>
                              <NavigationMenuLink
                                className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                                asChild
                              >
                                <Link
                                  href="/space-weather/alerts"
                                  className="group flex h-full flex-col justify-start rounded-md border border-border/40 bg-card/50 text-left transition-colors hover:border-amber-300/35 hover:bg-amber-300/8"
                                >
                                  <div className="px-4 py-3.5">
                                    <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-amber-300">
                                      <ShieldAlert className="w-4 h-4 shrink-0" />
                                      <span className="font-display text-[0.82rem] tracking-wide">SWPC Alerts</span>
                                    </div>
                                    <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-amber-300/75">
                                      Open the alerts desk for merged NOAA and DONKI notices with severity context.
                                    </p>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                            <li>
                              <NavigationMenuLink
                                className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                                asChild
                              >
                                <Link
                                  href="/space-weather/solar"
                                  className="group flex h-full flex-col justify-start rounded-md border border-border/40 bg-card/50 text-left transition-colors hover:border-orange-400/35 hover:bg-orange-400/8"
                                >
                                  <div className="px-4 py-3.5">
                                    <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-orange-400">
                                      <Sun className="w-4 h-4 shrink-0" />
                                      <span className="font-display text-[0.82rem] tracking-wide">Solar Watch</span>
                                    </div>
                                    <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-orange-400/75">
                                      Check GOES SUVI imagery, D-RAP absorption, and short-range flare probabilities.
                                    </p>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                            <li>
                              <NavigationMenuLink
                                className="!p-0 data-[active]:!bg-transparent data-[active]:!text-inherit hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit"
                                asChild
                              >
                                <Link
                                  href="/space-weather/geomagnetic"
                                  className="group flex h-full flex-col justify-start rounded-md border border-border/40 bg-card/50 text-left transition-colors hover:border-cyan-400/35 hover:bg-cyan-400/8"
                                >
                                  <div className="px-4 py-3.5">
                                    <div className="flex items-center gap-2 text-orange-100/85 group-hover:text-cyan-400">
                                      <Waves className="w-4 h-4 shrink-0" />
                                      <span className="font-display text-[0.82rem] tracking-wide">Geomagnetic</span>
                                    </div>
                                    <p className="mt-2 font-sans text-xs leading-[1.5] text-orange-100/50 group-hover:text-cyan-400/75">
                                      Follow Hp30, AE, and recent disturbance activity for Earth&apos;s magnetic response.
                                    </p>
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          </ul>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                {/* Auth separator and button */}
                <div className="mx-1 hidden h-4 w-px bg-border/50 lg:block" />
                <UserAuthButton />
              </div>
            </nav>
          </header>

          {/* Main Content */}
          <main className="flex-1">{children}</main>
          <CompareTray />

          {/* Footer */}
          <footer className="mt-auto border-t border-orange-200/20 bg-[#100c09]">
            <div className="shell-container py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full border border-orange-300/30 reactor-gradient opacity-80" />
                  <span className="font-display text-sm tracking-wider text-orange-100/80">
                    Cosmic Index
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-orange-100/65">
                    Data sourced from{" "}
                    <Link
                      href="https://www.nasa.gov/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-300 hover:underline"
                    >
                      NASA
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="https://www.swpc.noaa.gov/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-300 hover:underline"
                    >
                      NOAA SWPC
                    </Link>
                    , including public archives and operational datasets from JPL and other research providers.
                  </p>
                  <p className="mt-1 text-[11px] text-orange-100/45">
                    Cosmic Index is not affiliated with, endorsed by, or sponsored by NASA, JPL, NOAA, or other upstream data providers.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-orange-100/50">
                    <span className="text-orange-100/35">Help &amp; trust</span>
                    <Link href="/faq" className="text-orange-300 hover:underline">
                      FAQ
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden sm:flex items-center gap-1.5 text-xs text-orange-100/55">
                    <Keyboard className="w-3.5 h-3.5" />
                    Press <kbd className="rounded border border-orange-200/20 bg-[#1a130f] px-1 py-0.5 text-[10px]">?</kbd> for shortcuts
                  </span>
                  <Link
                    href="https://ko-fi.com/sadasspanda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-reactor-orange/30 bg-reactor-orange/5 hover:bg-reactor-orange/10 hover:border-reactor-orange/50 transition-all duration-300"
                  >
                    <svg
                      className="w-4 h-4 text-reactor-orange group-hover:scale-110 transition-transform duration-300"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span className="text-xs font-medium text-reactor-orange group-hover:text-amber-glow transition-colors duration-300">
                      Support on Ko-fi
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
        </KeyboardShortcutsProvider>
        </CompareProvider>
        </AppAuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
