import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchFireballs } from "@/lib/cneos-fireball";
import { FireballEvent } from "@/lib/types";
import { EventStreamResult } from "@/lib/api-client";
import {
  FireballsLoadingSkeleton,
  FireballsPageClient,
} from "./fireballs-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildCollectionPageJsonLd,
  buildHubMetadata,
  toSingleValueParams,
} from "@/lib/seo";

interface FireballsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const FIREBALLS_DESCRIPTION =
  "Browse reported fireball events (bright meteors) from NASA JPL CNEOS, including timing, estimated energy, and sometimes location, altitude, or velocity.";
const FIREBALLS_VARIANT_KEYS = [
  "reqLoc",
  "reqAlt",
  "reqVel",
  "sort",
  "order",
  "view",
] as const;

export async function generateMetadata({
  searchParams,
}: FireballsPageProps): Promise<Metadata> {
  const rawParams = toSingleValueParams(await searchParams);

  return buildHubMetadata({
    title: "Fireballs",
    description: FIREBALLS_DESCRIPTION,
    path: "/fireballs",
    variantKeys: FIREBALLS_VARIANT_KEYS,
    params: rawParams,
    imageAlt: "Cosmic Index - Fireballs",
  });
}

function buildInitialFetchKey(filters: {
  reqLoc: boolean;
  reqAlt: boolean;
  reqVel: boolean;
  sort: "date" | "energy" | "impact-e" | "vel" | "alt";
  order: "asc" | "desc";
}) {
  const query = new URLSearchParams();
  if (filters.reqLoc) query.set("reqLoc", "true");
  if (filters.reqAlt) query.set("reqAlt", "true");
  if (filters.reqVel) query.set("reqVel", "true");
  query.set("sort", filters.sort);
  query.set("order", filters.order);
  query.set("limit", "100");
  return query.toString();
}

export default async function FireballsPage({ searchParams }: FireballsPageProps) {
  const resolvedSearchParams = await searchParams;
  const raw = toSingleValueParams(resolvedSearchParams);

  const reqLoc = raw.reqLoc === "true";
  const reqAlt = raw.reqAlt === "true";
  const reqVel = raw.reqVel === "true";
  const sort = (["date", "energy", "impact-e", "vel", "alt"].includes(raw.sort ?? "")
    ? raw.sort
    : "date") as "date" | "energy" | "impact-e" | "vel" | "alt";
  const order = (raw.order === "asc" ? "asc" : "desc") as "asc" | "desc";

  const initialFetchKey = buildInitialFetchKey({
    reqLoc,
    reqAlt,
    reqVel,
    sort,
    order,
  });

  let initialData: EventStreamResult<FireballEvent> | null = null;
  let initialError: string | null = null;

  try {
    const result = await fetchFireballs({
      reqLoc,
      reqAlt,
      reqVel,
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
        filtersApplied: result.meta.filtersApplied,
      },
    };
  } catch (error) {
    initialError = error instanceof Error ? error.message : "An error occurred";
  }

  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Fireballs",
    description: FIREBALLS_DESCRIPTION,
    path: "/fireballs",
    sourceName: "NASA JPL CNEOS Fireball Data",
    sourceUrl: "https://cneos.jpl.nasa.gov/fireballs/",
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <Suspense fallback={<FireballsLoadingSkeleton />}>
        <FireballsPageClient
          initialData={initialData}
          initialError={initialError}
          initialFetchKey={initialFetchKey}
        />
      </Suspense>
    </>
  );
}
