import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Exoplanets",
  description:
    "Explore over 5,000 confirmed exoplanets from NASA's Exoplanet Archive. Search and filter by discovery method, size, habitability, and more.",
  openGraph: {
    title: "Exoplanets | Cosmic Index",
    description:
      "Explore over 5,000 confirmed exoplanets from NASA's Exoplanet Archive. Search and filter by discovery method, size, habitability, and more.",
    url: `${BASE_URL}/exoplanets`,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cosmic Index - Exoplanets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Exoplanets | Cosmic Index",
    description:
      "Explore over 5,000 confirmed exoplanets from NASA's Exoplanet Archive.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${BASE_URL}/exoplanets`,
  },
};

export default function ExoplanetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
