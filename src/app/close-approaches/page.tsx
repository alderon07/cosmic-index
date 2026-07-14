import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchCloseApproaches } from "@/lib/cneos-close-approach";
import { CloseApproach } from "@/lib/types";
import {
  CloseApproachesLoadingSkeleton,
  CloseApproachesPageClient,
} from "./close-approaches-page-client";
import { EventStreamResult } from "@/lib/api-client";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildCollectionPageJsonLd,
  buildHubMetadata,
  toSingleValueParams,
} from "@/lib/seo";

interface CloseApproachesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const CLOSE_APPROACHES_DESCRIPTION =
  "Browse upcoming close approaches of asteroids and comets near Earth, including approach time, distance (LD), relative speed, and hazard flags (PHA).";
const CLOSE_APPROACHES_VARIANT_KEYS = [
  "days",
  "distMaxLd",
  "phaOnly",
  "sort",
  "order",
  "view",
] as const;

export async function generateMetadata({
  searchParams,
}: CloseApproachesPageProps): Promise<Metadata> {
  const rawParams = toSingleValueParams(await searchParams);

  return buildHubMetadata({
    title: "Close Approaches",
    description: CLOSE_APPROACHES_DESCRIPTION,
    path: "/close-approaches",
    variantKeys: CLOSE_APPROACHES_VARIANT_KEYS,
    params: rawParams,
    imageAlt: "Cosmic Index - Close Approaches",
  });
}

function buildInitialFetchKey(filters: {
  days: string;
  distMaxLd: string;
  phaOnly: boolean;
  sort: "date" | "dist" | "h" | "v-rel";
  order: "asc" | "desc";
}): string {
  const query = new URLSearchParams();
  query.set("dateMin", "now");
  query.set("dateMax", `+${filters.days}`);
  query.set("distMaxLd", filters.distMaxLd);
  if (filters.phaOnly) query.set("phaOnly", "true");
  query.set("sort", filters.sort);
  query.set("order", filters.order);
  query.set("limit", "100");
  return query.toString();
}

export default async function CloseApproachesPage({
  searchParams,
}: CloseApproachesPageProps) {
  const resolvedSearchParams = await searchParams;
  const raw = toSingleValueParams(resolvedSearchParams);

  const days = ["1", "7", "30", "60", "90"].includes(raw.days ?? "") ? (raw.days as "1" | "7" | "30" | "60" | "90") : "60";
  const distMaxLd = ["1", "3", "5", "10", "20"].includes(raw.distMaxLd ?? "")
    ? (raw.distMaxLd as "1" | "3" | "5" | "10" | "20")
    : "10";
  const sort = (["date", "dist", "h", "v-rel"].includes(raw.sort ?? "")
    ? raw.sort
    : "date") as "date" | "dist" | "h" | "v-rel";
  const order = (raw.order === "desc" ? "desc" : "asc") as "asc" | "desc";
  const phaOnly = raw.phaOnly === "true";

  const initialFetchKey = buildInitialFetchKey({
    days,
    distMaxLd,
    phaOnly,
    sort,
    order,
  });

  let initialData: EventStreamResult<CloseApproach> | null = null;
  let initialError: string | null = null;

  try {
    const result = await fetchCloseApproaches({
      dateMin: "now",
      dateMax: `+${days}`,
      distMaxLd: Number(distMaxLd),
      phaOnly,
      sort,
      order,
      limit: 100,
    });
    initialData = {
      events: result.events,
      count: result.events.length,
      meta: {
        count: result.events.length,
        limitApplied: 100,
        phaFilterApplied: result.meta.phaFilterApplied,
        queryApplied: result.meta.queryApplied,
        ...(result.highlights ? { highlights: result.highlights } : {}),
      },
    };
  } catch (error) {
    initialError = error instanceof Error ? error.message : "An error occurred";
  }

  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Close Approaches",
    description: CLOSE_APPROACHES_DESCRIPTION,
    path: "/close-approaches",
    sourceName: "NASA JPL CNEOS Close Approach Data",
    sourceUrl: "https://cneos.jpl.nasa.gov/ca/",
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <Suspense fallback={<CloseApproachesLoadingSkeleton />}>
        <CloseApproachesPageClient
          initialData={initialData}
          initialError={initialError}
          initialFetchKey={initialFetchKey}
        />
      </Suspense>
    </>
  );
}
