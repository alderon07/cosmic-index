import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Space Weather",
  description:
    "Track solar flares, coronal mass ejections, and geomagnetic storms from NASA's DONKI database. View recent space weather events affecting Earth.",
  openGraph: {
    title: "Space Weather | Cosmic Index",
    description:
      "Track solar flares, coronal mass ejections, and geomagnetic storms from NASA's DONKI database. View recent space weather events affecting Earth.",
    url: `${BASE_URL}/space-weather`,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cosmic Index - Space Weather",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Space Weather | Cosmic Index",
    description:
      "Track solar flares, CMEs, and geomagnetic storms from NASA's DONKI database.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${BASE_URL}/space-weather`,
  },
};

export default function SpaceWeatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
