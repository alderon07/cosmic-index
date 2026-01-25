import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Cosmic Index - Explore Exoplanets & Small Bodies",
  description:
    "A retrofuturistic space encyclopedia for discovering exoplanets, asteroids, and comets. Powered by NASA and JPL data.",
  keywords: [
    "exoplanets",
    "asteroids",
    "comets",
    "space",
    "NASA",
    "astronomy",
    "space exploration",
  ],
  authors: [{ name: "Cosmic Index" }],
  openGraph: {
    title: "Cosmic Index",
    description: "Explore the cosmos - Exoplanets, Asteroids, and Comets",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background`}
      >
        <div className="relative min-h-screen vignette">
          {/* Navigation */}
          <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full reactor-gradient pulse-glow" />
                <span className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                  Cosmic Index
                </span>
              </a>
              <div className="flex items-center gap-6">
                <a
                  href="/exoplanets"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Exoplanets
                </a>
                <a
                  href="/small-bodies"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Small Bodies
                </a>
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
                  <a
                    href="https://exoplanetarchive.ipac.caltech.edu/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-radium-teal hover:underline"
                  >
                    NASA Exoplanet Archive
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-radium-teal hover:underline"
                  >
                    JPL Small-Body Database
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
