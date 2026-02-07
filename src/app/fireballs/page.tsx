import { Suspense } from "react";
import { fetchFireballs } from "@/lib/cneos-fireball";
import { FireballEvent } from "@/lib/types";
import { EventStreamResult } from "@/lib/api-client";
import {
  FireballsLoadingSkeleton,
  FireballsPageClient,
} from "./fireballs-page-client";

interface FireballsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSingleValueParams(
  params: Record<string, string | string[] | undefined>
): Record<string, string> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      entries.push([key, value]);
    } else if (Array.isArray(value) && value.length > 0) {
      entries.push([key, value[0]]);
    }
  }
  return Object.fromEntries(entries);
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

  return (
    <Suspense fallback={<FireballsLoadingSkeleton />}>
      <FireballsPageClient
        initialData={initialData}
        initialError={initialError}
        initialFetchKey={initialFetchKey}
      />
    </Suspense>
  );
}
