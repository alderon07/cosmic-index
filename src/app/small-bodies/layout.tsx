import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Small Bodies",
  description:
    "Discover over 1,000,000 asteroids and comets from JPL's Small-Body Database. Search and filter by type, orbit class, NEO status, and potential hazard classification.",
  openGraph: {
    title: "Small Bodies | Cosmic Index",
    description:
      "Discover over 1,000,000 asteroids and comets from JPL's Small-Body Database. Search and filter by type, orbit class, NEO status, and more.",
    url: `${BASE_URL}/small-bodies`,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cosmic Index - Small Bodies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Small Bodies | Cosmic Index",
    description:
      "Discover over 1,000,000 asteroids and comets from JPL's Small-Body Database.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${BASE_URL}/small-bodies`,
  },
};

export default function SmallBodiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
