import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { NoAdsMarker } from "@/components/ads/no-ads-marker";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SpaceWeatherDetail } from "@/components/space-weather-detail";
import { buttonVariants } from "@/components/ui/button";
import {
  DonkiUpstreamUnavailableError,
  fetchSpaceWeatherEventById,
  getEventTypeLabel,
} from "@/lib/nasa-donki";
import { THEMES } from "@/lib/theme";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, buildRobots } from "@/lib/seo";
import { buildSpaceWeatherEventMetadata } from "@/lib/space-weather-seo";
import type { AnySpaceWeatherEvent } from "@/lib/types";

const theme = THEMES["space-weather"];

interface SpaceWeatherDetailPageProps {
  params: Promise<{ id: string }>;
}

type EventDetailResult =
  | { kind: "found"; event: AnySpaceWeatherEvent }
  | { kind: "not-found" }
  | { kind: "unavailable" };

const getSpaceWeatherEventById = cache(async (id: string): Promise<EventDetailResult> => {
  const eventId = decodeURIComponent(id);
  try {
    const event = await fetchSpaceWeatherEventById(eventId);
    return event ? { kind: "found", event } : { kind: "not-found" };
  } catch (error) {
    if (error instanceof DonkiUpstreamUnavailableError) {
      return { kind: "unavailable" };
    }
    throw error;
  }
});

// Generate metadata
export async function generateMetadata({
  params,
}: SpaceWeatherDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getSpaceWeatherEventById(id);

  if (result.kind === "unavailable") {
    return {
      title: "Space Weather Event Temporarily Unavailable",
      description: "NASA's event data is temporarily unavailable. Please try again later.",
      robots: buildRobots(false),
    };
  }

  if (result.kind === "not-found") {
    return {
      title: "Event Not Found",
      description: "The requested space weather event could not be found.",
    };
  }

  return buildSpaceWeatherEventMetadata(result.event);
}

export default async function SpaceWeatherDetailPage({
  params,
}: SpaceWeatherDetailPageProps) {
  const { id } = await params;
  const result = await getSpaceWeatherEventById(id);

  if (result.kind === "unavailable") {
    const retryHref = `/space-weather/${encodeURIComponent(decodeURIComponent(id))}`;
    return (
      <div className="shell-container py-8">
        <NoAdsMarker />
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Space Weather", href: "/space-weather" },
            { label: "Events", href: "/space-weather/events" },
          ]}
          linkHoverClassName={theme.hoverText}
        />
        <section className="mx-auto max-w-xl py-12" aria-labelledby="event-unavailable-title">
          <h1 id="event-unavailable-title" className="font-display text-2xl text-foreground sm:text-3xl">
            Event data is temporarily unavailable
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We couldn&apos;t retrieve this event from NASA. Try again in a few minutes
            or browse other space weather events.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={retryHref} className={buttonVariants({ className: "min-h-11" })}>
              Try again
            </a>
            <Link
              href="/space-weather/events"
              prefetch={false}
              className={buttonVariants({ variant: "outline", className: "min-h-11" })}
            >
              Browse events
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (result.kind === "not-found") {
    notFound();
  }

  const event = result.event;
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
