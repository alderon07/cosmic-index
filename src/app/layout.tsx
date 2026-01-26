import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
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

const BASE_URL = "https://cosmic-index.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Cosmic Index - Explore Exoplanets & Small Bodies",
    template: "%s | Cosmic Index",
  },
  description:
    "A retrofuturistic space encyclopedia for discovering exoplanets, asteroids, and comets. Explore 5,000+ exoplanets and 1,000,000+ small bodies with data from NASA and JPL.",
  keywords: [
    "exoplanets",
    "asteroids",
    "comets",
    "space",
    "NASA",
    "astronomy",
    "space exploration",
    "near-earth objects",
    "NEO",
    "planetary science",
  ],
  authors: [{ name: "Cosmic Index" }],
  creator: "Cosmic Index",
  publisher: "Cosmic Index",
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Cosmic Index",
    title: "Cosmic Index - Explore Exoplanets & Small Bodies",
    description:
      "A retrofuturistic space encyclopedia for discovering exoplanets, asteroids, and comets. Powered by NASA and JPL data.",
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
    title: "Cosmic Index - Explore Exoplanets & Small Bodies",
    description:
      "A retrofuturistic space encyclopedia for discovering exoplanets, asteroids, and comets. Powered by NASA and JPL data.",
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
    "A retrofuturistic space encyclopedia for discovering exoplanets, asteroids, and comets. Explore 5,000+ exoplanets and 1,000,000+ small bodies with data from NASA and JPL.",
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
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background`}
      >
        <div className="relative min-h-screen vignette">
          {/* Navigation */}
          <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full reactor-gradient pulse-glow" />
                <span className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                  Cosmic Index
                </span>
              </Link>
              <div className="flex items-center gap-6">
                <Link
                  href="/exoplanets"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Exoplanets
                </Link>
                <Link
                  href="/small-bodies"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Small Bodies
                </Link>
              </div>
            </nav>
          </header>

          {/* Main Content */}
          <main>{children}</main>

          {/* Footer */}
          <footer className="border-t border-border/50 mt-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full reactor-gradient opacity-50" />
                  <span className="font-display text-sm text-muted-foreground">
                    Cosmic Index
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center md:text-right">
                  Data sourced from{" "}
                  <Link
                    href="https://exoplanetarchive.ipac.caltech.edu/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-radium-teal hover:underline"
                  >
                    NASA Exoplanet Archive
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-radium-teal hover:underline"
                  >
                    JPL Small-Body Database
                  </Link>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
