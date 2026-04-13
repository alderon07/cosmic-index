import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Space Weather",
  description:
    "Space weather observatory routes for the dashboard overview, DONKI event browser, alerts desk, solar monitoring, and geomagnetic monitoring.",
  openGraph: {
    title: "Space Weather | Cosmic Index",
    description:
      "Space weather observatory routes for the dashboard overview, DONKI event browser, alerts desk, solar monitoring, and geomagnetic monitoring.",
    url: `${BASE_URL}/space-weather`,
    type: "website",
    images: [
      // TODO: Replace the generic site OG image with a dedicated space-weather social card.
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
      "Observatory overview plus DONKI events, alerts, solar monitoring, and geomagnetic monitoring.",
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
