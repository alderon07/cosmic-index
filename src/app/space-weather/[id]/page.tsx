import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SpaceWeatherDetail } from "@/components/space-weather-detail";
import {
  fetchSpaceWeatherEventById,
  getEventTypeLabel,
} from "@/lib/nasa-donki";
import {
  SolarFlareEvent,
  CMEEvent,
  GSTEvent,
} from "@/lib/types";
import { BASE_URL } from "@/lib/config";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];

interface SpaceWeatherDetailPageProps {
  params: Promise<{ id: string }>;
}

const getSpaceWeatherEventById = cache(async (id: string) => {
  const eventId = decodeURIComponent(id);
  return fetchSpaceWeatherEventById(eventId);
});

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

// Generate metadata
export async function generateMetadata({
  params,
}: SpaceWeatherDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getSpaceWeatherEventById(id);

  if (!event) {
    return {
      title: "Event Not Found",
      description: "The requested space weather event could not be found.",
    };
  }

  const typeLabel = getEventTypeLabel(event.eventType);
  const date = formatDate(event.startTime);
  const title = `${typeLabel} - ${date}`;

  let description = `${typeLabel} detected on ${date}.`;
  if (event.eventType === "FLR") {
    description = `${(event as SolarFlareEvent).classType}-class solar flare on ${date}.`;
  } else if (event.eventType === "CME" && (event as CMEEvent).speed) {
    description = `Coronal mass ejection at ${(event as CMEEvent).speed} km/s on ${date}.`;
  } else if (event.eventType === "GST") {
    description = `Geomagnetic storm with Kp index ${(event as GSTEvent).kpIndex} on ${date}.`;
  }

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Cosmic Index`,
      description,
      url: `${BASE_URL}/space-weather/${id}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${title} | Cosmic Index`,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/space-weather/${id}`,
    },
  };
}

export default async function SpaceWeatherDetailPage({
  params,
}: SpaceWeatherDetailPageProps) {
  const { id } = await params;
  const event = await getSpaceWeatherEventById(id);

  if (!event) {
    notFound();
  }

  const typeLabel = getEventTypeLabel(event.eventType);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Space Weather", href: "/space-weather" },
    { label: typeLabel },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={breadcrumbItems}
        className="mb-6"
        linkHoverClassName={theme.hoverText}
      />
      <SpaceWeatherDetail event={event} />
    </div>
  );
}
