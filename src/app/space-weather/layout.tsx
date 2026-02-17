import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Space Weather",
  description:
    "Track solar flares, CMEs, geomagnetic storms, interplanetary shocks, high-speed streams, and SEP events from NASA's DONKI database, plus latest space weather notifications.",
  openGraph: {
    title: "Space Weather | Cosmic Index",
    description:
      "Track solar flares, CMEs, geomagnetic storms, interplanetary shocks, high-speed streams, and SEP events from NASA's DONKI database, plus latest space weather notifications.",
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
      "Track NASA DONKI space weather events (FLR/CME/GST/IPS/HSS/SEP) and the latest notifications feed.",
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
