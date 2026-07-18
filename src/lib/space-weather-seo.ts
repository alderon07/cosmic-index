import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";
import { getEventTypeLabel } from "@/lib/nasa-donki";
import { buildRobots } from "@/lib/seo";
import type {
  AnySpaceWeatherEvent,
  CMEEvent,
  GSTEvent,
  IPSEvent,
  SEPEvent,
  SolarFlareEvent,
} from "@/lib/types";

function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function eventDescription(event: AnySpaceWeatherEvent, typeLabel: string, date: string): string {
  if (event.eventType === "FLR") {
    return `${(event as SolarFlareEvent).classType}-class solar flare on ${date}.`;
  }
  if (event.eventType === "CME" && (event as CMEEvent).speed) {
    return `Coronal mass ejection at ${(event as CMEEvent).speed} km/s on ${date}.`;
  }
  if (event.eventType === "GST") {
    return `Geomagnetic storm with Kp index ${(event as GSTEvent).kpIndex} on ${date}.`;
  }
  if (event.eventType === "IPS") {
    const location = (event as IPSEvent).location;
    return `Interplanetary shock${location ? ` near ${location}` : ""} observed on ${date}.`;
  }
  if (event.eventType === "SEP") {
    const instrument = (event as SEPEvent).instruments?.[0];
    return `Solar energetic particle event on ${date}${instrument ? ` observed by ${instrument}` : ""}.`;
  }
  return `${typeLabel} detected on ${date}.`;
}

export function buildSpaceWeatherEventMetadata(event: AnySpaceWeatherEvent): Metadata {
  const typeLabel = getEventTypeLabel(event.eventType);
  const date = formatEventDate(event.startTime);
  const title = `${typeLabel} - ${date}`;
  const description = eventDescription(event, typeLabel, date);
  const canonicalUrl = `${BASE_URL}/space-weather/${encodeURIComponent(event.id)}`;

  return {
    title,
    description,
    robots: buildRobots(false),
    openGraph: {
      title: `${title} | Cosmic Index`,
      description,
      url: canonicalUrl,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${title} | Cosmic Index`,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
