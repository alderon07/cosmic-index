import type { Metadata } from "next";
import { Audiowide, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Circle, Star, CircleDot, Crosshair, Flame, CloudLightning, Keyboard } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts";

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body
        className={`${audiowide.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background`}
      >
        <KeyboardShortcutsProvider>
        <div className="relative min-h-screen vignette">
          {/* Navigation */}
          <header className="sticky top-0 z-50 border-b border-orange-200/20 bg-[#120d0a]/90 backdrop-blur-md">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-full border border-orange-300/35 reactor-gradient pulse-glow" />
                <span className="font-display text-xl tracking-wider text-orange-100 transition-colors group-hover:text-orange-300">
                  Cosmic Index
                </span>
              </Link>
              <div className="flex items-center gap-2 sm:gap-6">
                <Link
                  href="/exoplanets"
                  className="font-display text-sm tracking-wide text-orange-100/75 transition-colors hover:text-orange-300"
                  title="Exoplanets"
                >
                  <Circle className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Exoplanets</span>
                </Link>
                <Link
                  href="/stars"
                  className="font-display text-sm tracking-wide text-orange-100/75 transition-colors hover:text-amber-200"
                  title="Stars"
                >
                  <Star className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Stars</span>
                </Link>
                <Link
                  href="/small-bodies"
                  className="font-display text-sm tracking-wide text-orange-100/75 transition-colors hover:text-amber-300"
                  title="Small Bodies"
                >
                  <CircleDot className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Small Bodies</span>
                </Link>
                <Link
                  href="/close-approaches"
                  className="font-display text-sm tracking-wide text-orange-100/75 transition-colors hover:text-orange-300"
                  title="Close Approaches"
                >
                  <Crosshair className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Flybys</span>
                </Link>
                <Link
                  href="/fireballs"
                  className="font-display text-sm tracking-wide text-orange-100/75 transition-colors hover:text-orange-300"
                  title="Fireballs"
                >
                  <Flame className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Fireballs</span>
                </Link>
                <Link
                  href="/space-weather"
                  className="font-display text-sm tracking-wide text-orange-100/75 transition-colors hover:text-amber-200"
                  title="Space Weather"
                >
                  <CloudLightning className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Weather</span>
                </Link>
              </div>
            </nav>
          </header>

          {/* Main Content */}
          <main>{children}</main>

          {/* Footer */}
          <footer className="mt-auto border-t border-orange-200/20 bg-[#100c09]">
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full border border-orange-300/30 reactor-gradient opacity-80" />
                  <span className="font-display text-sm tracking-wider text-orange-100/80">
                    Cosmic Index
                  </span>
                </div>
                <p className="text-center text-xs text-orange-100/65 md:text-right">
                  Data sourced from{" "}
                  <Link
                    href="https://exoplanetarchive.ipac.caltech.edu/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-300 hover:underline"
                  >
                    NASA Exoplanet Archive
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-300 hover:underline"
                  >
                    JPL Small-Body Database
                  </Link>
                </p>
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
        <Analytics />
      </body>
    </html>
  );
}
