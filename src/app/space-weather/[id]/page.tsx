import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SpaceWeatherDetail } from "@/components/space-weather-detail";
import {
  fetchSpaceWeatherEventById,
  getEventTypeLabel,
} from "@/lib/nasa-donki";
import { THEMES } from "@/lib/theme";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { buildSpaceWeatherEventMetadata } from "@/lib/space-weather-seo";

const theme = THEMES["space-weather"];

interface SpaceWeatherDetailPageProps {
  params: Promise<{ id: string }>;
}

const getSpaceWeatherEventById = cache(async (id: string) => {
  const eventId = decodeURIComponent(id);
  return fetchSpaceWeatherEventById(eventId);
});

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

  return buildSpaceWeatherEventMetadata(event);
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
    { label: "Events", href: "/space-weather/events" },
    { label: typeLabel },
  ];

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbItems)} />
      <div className="shell-container py-8">
        <Breadcrumbs
          items={breadcrumbItems}
          className="mb-6"
          linkHoverClassName={theme.hoverText}
        />
        <SpaceWeatherDetail event={event} />
      </div>
    </>
  );
}
