import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Stars",
  description:
    "Explore over 4,500 host stars of known exoplanets from NASA's Exoplanet Archive. Browse by spectral class, planet count, distance, and brightness.",
  openGraph: {
    title: "Stars | Cosmic Index",
    description:
      "Explore over 4,500 host stars of known exoplanets from NASA's Exoplanet Archive. Browse by spectral class, planet count, distance, and more.",
    url: `${BASE_URL}/stars`,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cosmic Index - Stars",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stars | Cosmic Index",
    description:
      "Explore over 4,500 host stars of known exoplanets from NASA's Exoplanet Archive.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${BASE_URL}/stars`,
  },
};

export default function StarsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
