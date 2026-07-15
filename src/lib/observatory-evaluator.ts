import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  CloseApproachWatchConfigSchema,
  createCloseApproachTriggerKey,
  createSpaceWeatherTriggerKey,
  getMaximumSeverity,
  matchesCloseApproachWatch,
  matchesSpaceWeatherWatch,
  SpaceWeatherWatchConfigSchema,
  type CloseApproachWatchConfig,
  type SpaceWeatherWatchConfig,
} from "@/lib/observatory";
import { fetchCloseApproaches } from "@/lib/cneos-close-approach";
import { fetchUnifiedSpaceWeatherAlerts } from "@/lib/space-weather/alerts";
import {
  closeApproachDestination,
  ObservatorySourceUrlSchema,
} from "@/lib/observatory-url";
import type {
  CloseApproachListResponse,
  SpaceWeatherAlertCategory,
  SpaceWeatherAlertSource,
  SpaceWeatherSeverity,
} from "@/lib/types";

export type ObservatoryEvaluatorDomain = "space_weather" | "close_approach" | "cleanup";
export type ObservatoryWatchDomain = Exclude<ObservatoryEvaluatorDomain, "cleanup">;

const ContinuationPayloadSchema = z.object({
  afterId: z.number().int().positive(),
  owner: z.string().uuid(),
}).strict();

function decodeContinuation(value: string): z.infer<typeof ContinuationPayloadSchema> | null {
  try {
    return ContinuationPayloadSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
}

function encodeContinuation(afterId: number, owner: string): string {
  return Buffer.from(JSON.stringify({ afterId, owner }), "utf8").toString("base64url");
}

const ContinuationSchema = z.string().max(256).refine(
  (value) => decodeContinuation(value) !== null,
  "Invalid evaluator continuation",
);

export const ObservatoryEvaluatorRequestSchema = z.discriminatedUnion("domain", [
  z.object({ domain: z.literal("space_weather"), continuation: ContinuationSchema.optional() }).strict(),
  z.object({ domain: z.literal("close_approach"), continuation: ContinuationSchema.optional() }).strict(),
  z.object({ domain: z.literal("cleanup"), continuation: z.literal("more").optional() }).strict(),
]);

export type ObservatoryEvaluatorRequest = z.infer<typeof ObservatoryEvaluatorRequestSchema>;

export interface ObservatoryWatchRecord {
  id: number;
  userId: string;
  name: string;
  alertType: ObservatoryWatchDomain;
  configHash: string;
  config: unknown;
  enabledAt: string;
  lastMatchedAt: string | null;
}

export interface SpaceWeatherEvaluatorCandidate {
  id: string;
  source: SpaceWeatherAlertSource;
  category: SpaceWeatherAlertCategory;
  title: string;
  summary: string;
  severity: SpaceWeatherSeverity;
  issuedAt: string;
  sourceUrl?: string;
  relatedEvents: Array<{ severity: SpaceWeatherSeverity }>;
}

export interface CloseApproachEvaluatorCandidate {
  id: string;
  designation: string;
  orbitId: string;
  approachTimeRaw: string;
  jd?: number;
  distanceLd: number;
  distanceKm: number;
  relativeVelocityKmS: number;
  isPha?: boolean;
  timeUncertainty?: string;
}

export interface ObservatorySignalDraft {
  triggerKey: string;
  source: "donki" | "swpc" | "cneos";
  eventType: string;
  severity: SpaceWeatherSeverity | null;
  title: string;
  summary: string;
  matchReason: string;
  eventAt: string | null;
  sourceAt: string | null;
  destinationUrl: string;
  sourceUrl?: string;
  snapshot: Record<string, unknown>;
}

export type SignalWriteResult = "inserted" | "updated" | "duplicate" | "watch_disabled";

export interface ObservatoryEvaluatorStore {
  countEnabledWatches(domain: ObservatoryWatchDomain): Promise<number>;
  acquireLease(input: {
    domain: ObservatoryWatchDomain;
    owner: string;
    ttlSeconds: number;
    continuation: boolean;
  }): Promise<{ acquired: boolean; watermark: string | null }>;
  listEnabledWatchesPage(input: {
    domain: ObservatoryWatchDomain;
    afterId: number | null;
    limit: number;
  }): Promise<{ watches: ObservatoryWatchRecord[]; hasMore: boolean }>;
  recordSignalDurably(input: {
    watch: ObservatoryWatchRecord;
    signal: ObservatorySignalDraft;
  }): Promise<SignalWriteResult>;
  recordTriggerDurably(input: {
    watch: ObservatoryWatchRecord;
    source: ObservatorySignalDraft["source"];
    triggerKey: string;
  }): Promise<"inserted" | "duplicate" | "watch_disabled">;
  completeLease(input: {
    domain: ObservatoryWatchDomain;
    owner: string;
    watermark: string | null;
  }): Promise<void>;
  failLease(input: {
    domain: ObservatoryWatchDomain;
    owner: string;
    errorCode: string;
  }): Promise<void>;
  cleanupSignals(input: { limit: number }): Promise<{ deleted: number; hasMore: boolean }>;
}

interface CandidatePage<T> {
  candidates: T[];
  complete: boolean;
}

const SeveritySchema = z.enum(["minor", "moderate", "strong", "severe", "extreme"]);
const SpaceWeatherCandidateSchema = z.object({
  id: z.string().trim().min(1).max(240),
  source: z.enum(["donki", "swpc"]),
  category: z.enum(["flr", "sep", "cme", "ips", "gst", "rbe", "mpc", "other"]),
  title: z.string().min(1).max(1_000),
  summary: z.string().max(5_000),
  severity: SeveritySchema,
  issuedAt: z.string().datetime({ offset: true }),
  sourceUrl: z.string().url().optional(),
  relatedEvents: z.array(z.object({ severity: SeveritySchema }).strict()).max(100),
}).strict();
const CloseApproachCandidateSchema = z.object({
  id: z.string().trim().min(1).max(500),
  designation: z.string().trim().min(1).max(160),
  orbitId: z.string().max(160),
  approachTimeRaw: z.string().min(1).max(160),
  jd: z.number().finite().optional(),
  distanceLd: z.number().finite().nonnegative(),
  distanceKm: z.number().finite().nonnegative(),
  relativeVelocityKmS: z.number().finite().nonnegative(),
  isPha: z.boolean().optional(),
  timeUncertainty: z.string().max(160).optional(),
}).strict();

export interface ObservatoryEvaluatorDependencies {
  store: ObservatoryEvaluatorStore;
  now?: () => Date;
  watchPageSize?: number;
  cleanupBatchSize?: number;
  leaseTtlSeconds?: number;
  fetchSpaceWeatherCandidates?: (
    watermark: string | null,
    now: Date,
  ) => Promise<CandidatePage<SpaceWeatherEvaluatorCandidate>>;
  fetchCloseApproachCandidates?: (
    watermark: string | null,
    now: Date,
  ) => Promise<CandidatePage<CloseApproachEvaluatorCandidate>>;
}

export interface ObservatoryEvaluatorResult {
  domain: ObservatoryEvaluatorDomain;
  status: "ok" | "no_watches" | "busy" | "incomplete";
  processedWatches: number;
  skippedWatches: number;
  candidateCount: number;
  inserted: number;
  updated: number;
  deduplicated: number;
  continuation?: string;
  cleanupDeleted?: number;
}

const DEFAULT_WATCH_PAGE_SIZE = 100;
const DEFAULT_CLEANUP_BATCH_SIZE = 250;
const DEFAULT_LEASE_TTL_SECONDS = 240;
const MAX_SOURCE_CANDIDATES = 500;

function emptyResult(
  domain: ObservatoryEvaluatorDomain,
  status: ObservatoryEvaluatorResult["status"],
): ObservatoryEvaluatorResult {
  return {
    domain,
    status,
    processedWatches: 0,
    skippedWatches: 0,
    candidateCount: 0,
    inserted: 0,
    updated: 0,
    deduplicated: 0,
  };
}

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function defaultFetchSpaceWeatherCandidates(
  watermark: string | null,
  now: Date,
): Promise<CandidatePage<SpaceWeatherEvaluatorCandidate>> {
  const watermarkTime = watermark ? new Date(watermark).getTime() : NaN;
  const overlapStart = Number.isFinite(watermarkTime)
    ? new Date(watermarkTime - 60 * 60 * 1000)
    : new Date(now.getTime() - 30 * 86_400_000);
  const response = await fetchUnifiedSpaceWeatherAlerts({
    startDate: isoDateOnly(overlapStart),
    endDate: isoDateOnly(now),
    limit: MAX_SOURCE_CANDIDATES,
  });

  return {
    candidates: response.alerts.map((alert) => ({
      id: alert.id,
      source: alert.source,
      category: alert.category,
      title: alert.title,
      summary: alert.summary,
      severity: alert.severity,
      issuedAt: alert.issuedAt,
      sourceUrl: alert.sourceUrl,
      relatedEvents: alert.relatedEvents.map((event) => ({ severity: event.severity })),
    })),
    complete: !response.meta.totalCapApplied && response.alerts.length === response.totalAvailable,
  };
}

export function buildCloseApproachCandidatePage(
  response: CloseApproachListResponse,
): CandidatePage<CloseApproachEvaluatorCandidate> {
  return {
    candidates: response.events.map((event) => ({
      id: event.id,
      designation: event.designation,
      orbitId: event.orbitId,
      approachTimeRaw: event.approachTimeRaw,
      distanceLd: event.distanceLd,
      distanceKm: event.distanceKm,
      relativeVelocityKmS: event.relativeVelocityKmS,
      ...(event.jd !== undefined ? { jd: event.jd } : {}),
      ...(event.isPha !== undefined ? { isPha: event.isPha } : {}),
      ...(event.timeUncertainty !== undefined
        ? { timeUncertainty: event.timeUncertainty }
        : {}),
    })),
    // The CAD API has no cursor. Treat a full cap as potentially truncated,
    // even when the reported count is exactly the cap.
    complete: response.events.length < 200 && response.events.length >= response.meta.count,
  };
}

async function defaultFetchCloseApproachCandidates(): Promise<CandidatePage<CloseApproachEvaluatorCandidate>> {
  const response = await fetchCloseApproaches({
    dateMin: "now",
    dateMax: "+30",
    distMaxLd: 20,
    sort: "date",
    order: "asc",
    limit: 200,
  });
  return buildCloseApproachCandidatePage(response);
}

function weatherSignal(
  candidate: SpaceWeatherEvaluatorCandidate,
  effectiveSeverity: SpaceWeatherSeverity,
): ObservatorySignalDraft {
  return {
    triggerKey: createSpaceWeatherTriggerKey(candidate.source, candidate.id),
    source: candidate.source,
    eventType: candidate.category,
    severity: effectiveSeverity,
    title: candidate.title.slice(0, 160),
    summary: candidate.summary.slice(0, 500),
    matchReason: `${candidate.category.toUpperCase()} activity reached ${effectiveSeverity} severity.`,
    eventAt: candidate.issuedAt,
    sourceAt: candidate.issuedAt,
    destinationUrl: "/space-weather/alerts",
    ...(allowlistedSourceUrl(candidate.source, candidate.sourceUrl)
      ? { sourceUrl: candidate.sourceUrl }
      : {}),
    snapshot: {
      id: candidate.id,
      source: candidate.source,
      category: candidate.category,
      severity: effectiveSeverity,
      issuedAt: candidate.issuedAt,
    },
  };
}

function allowlistedSourceUrl(
  _source: SpaceWeatherAlertSource,
  value: string | undefined,
): boolean {
  return value !== undefined && ObservatorySourceUrlSchema.safeParse(value).success;
}

function approachSignal(
  config: CloseApproachWatchConfig,
  candidate: CloseApproachEvaluatorCandidate,
): ObservatorySignalDraft {
  return {
    triggerKey: createCloseApproachTriggerKey(candidate.designation, candidate.jd!),
    source: "cneos",
    eventType: "close_approach",
    severity: null,
    title: `${candidate.designation} is approaching Earth`.slice(0, 160),
    summary: `${candidate.designation} will pass at ${candidate.distanceLd.toFixed(2)} Moon distances.`,
    matchReason: `This approach is within your ${config.maxDistanceLd} Moon-distance watch.`,
    eventAt: new Date(Math.round((candidate.jd! - 2_440_587.5) * 86_400_000)).toISOString(),
    sourceAt: null,
    destinationUrl: closeApproachDestination(config, candidate.id),
    snapshot: {
      id: candidate.id,
      designation: candidate.designation,
      orbitId: candidate.orbitId,
      jd: candidate.jd,
      approachTimeRaw: candidate.approachTimeRaw,
      distanceLd: candidate.distanceLd,
      distanceKm: candidate.distanceKm,
      relativeVelocityKmS: candidate.relativeVelocityKmS,
      isPha: candidate.isPha,
      timeUncertainty: candidate.timeUncertainty,
    },
  };
}

function initialApproachSummary(
  config: CloseApproachWatchConfig,
  overflow: CloseApproachEvaluatorCandidate[],
): ObservatorySignalDraft {
  return {
    triggerKey: "close-approach:initial-summary",
    source: "cneos",
    eventType: "close_approach_summary",
    severity: null,
    title: `${overflow.length} more close approaches matched`,
    summary: `There are ${overflow.length} additional upcoming approaches inside your watch.`,
    matchReason: `These approaches are within ${config.maxDistanceLd} Moon distances during the next ${config.leadTimeDays} days.`,
    eventAt: null,
    sourceAt: null,
    destinationUrl: closeApproachDestination(config),
    snapshot: {
      count: overflow.length,
      firstJd: overflow[0]?.jd,
      lastJd: overflow.at(-1)?.jd,
    },
  };
}

function updateCounts(result: ObservatoryEvaluatorResult, write: SignalWriteResult): void {
  if (write === "inserted") result.inserted += 1;
  else if (write === "updated") result.updated += 1;
  else result.deduplicated += 1;
}

async function recordWeatherMatches(
  watch: ObservatoryWatchRecord,
  config: SpaceWeatherWatchConfig,
  candidates: SpaceWeatherEvaluatorCandidate[],
  store: ObservatoryEvaluatorStore,
  result: ObservatoryEvaluatorResult,
): Promise<void> {
  const enabledAt = new Date(watch.enabledAt).getTime();
  for (const candidate of candidates) {
    const issuedAt = new Date(candidate.issuedAt).getTime();
    if (!Number.isFinite(issuedAt) || issuedAt < enabledAt) continue;
    const effectiveSeverity = getMaximumSeverity([
      candidate.severity,
      ...candidate.relatedEvents.map((event) => event.severity),
    ]);
    if (!matchesSpaceWeatherWatch(config, { ...candidate, severity: effectiveSeverity })) continue;
    updateCounts(
      result,
      await store.recordSignalDurably({ watch, signal: weatherSignal(candidate, effectiveSeverity) }),
    );
  }
}

async function recordApproachMatches(
  watch: ObservatoryWatchRecord,
  config: CloseApproachWatchConfig,
  candidates: CloseApproachEvaluatorCandidate[],
  now: Date,
  store: ObservatoryEvaluatorStore,
  result: ObservatoryEvaluatorResult,
): Promise<void> {
  const matches = candidates
    .filter((candidate) => matchesCloseApproachWatch(config, candidate, now))
    .sort((left, right) => left.jd! - right.jd!);
  const individual = watch.lastMatchedAt === null ? matches.slice(0, 10) : matches;
  for (const candidate of individual) {
    updateCounts(
      result,
      await store.recordSignalDurably({ watch, signal: approachSignal(config, candidate) }),
    );
  }
  if (watch.lastMatchedAt === null && matches.length > 10) {
    for (const candidate of matches.slice(10)) {
      await store.recordTriggerDurably({
        watch,
        source: "cneos",
        triggerKey: createCloseApproachTriggerKey(candidate.designation, candidate.jd!),
      });
    }
    updateCounts(
      result,
      await store.recordSignalDurably({
        watch,
        signal: initialApproachSummary(config, matches.slice(10)),
      }),
    );
  }
}

export async function evaluateObservatory(
  input: ObservatoryEvaluatorRequest,
  dependencies: ObservatoryEvaluatorDependencies,
): Promise<ObservatoryEvaluatorResult> {
  const parsed = ObservatoryEvaluatorRequestSchema.parse(input);
  const { store } = dependencies;
  if (parsed.domain === "cleanup") {
    const cleanup = await store.cleanupSignals({
      limit: dependencies.cleanupBatchSize ?? DEFAULT_CLEANUP_BATCH_SIZE,
    });
    return {
      ...emptyResult("cleanup", "ok"),
      cleanupDeleted: cleanup.deleted,
      ...(cleanup.hasMore ? { continuation: "more" } : {}),
    };
  }

  const domain = parsed.domain;
  const continuation = parsed.continuation ? decodeContinuation(parsed.continuation) : null;
  if (await store.countEnabledWatches(domain) === 0) {
    if (continuation) {
      const lease = await store.acquireLease({
        domain,
        owner: continuation.owner,
        ttlSeconds: dependencies.leaseTtlSeconds ?? DEFAULT_LEASE_TTL_SECONDS,
        continuation: true,
      });
      if (lease.acquired) {
        await store.completeLease({
          domain,
          owner: continuation.owner,
          watermark: (dependencies.now?.() ?? new Date()).toISOString(),
        });
      }
    }
    return emptyResult(domain, "no_watches");
  }

  const owner = continuation?.owner ?? randomUUID();
  const lease = await store.acquireLease({
    domain,
    owner,
    ttlSeconds: dependencies.leaseTtlSeconds ?? DEFAULT_LEASE_TTL_SECONDS,
    continuation: continuation !== null,
  });
  if (!lease.acquired) return emptyResult(domain, "busy");

  try {
    const now = dependencies.now?.() ?? new Date();
    const rawSource = domain === "space_weather"
      ? await (dependencies.fetchSpaceWeatherCandidates ?? defaultFetchSpaceWeatherCandidates)(lease.watermark, now)
      : await (dependencies.fetchCloseApproachCandidates ?? defaultFetchCloseApproachCandidates)(lease.watermark, now);
    const source = domain === "space_weather"
      ? {
          complete: rawSource.complete,
          candidates: z.array(SpaceWeatherCandidateSchema).max(MAX_SOURCE_CANDIDATES)
            .parse(rawSource.candidates),
        }
      : {
          complete: rawSource.complete,
          candidates: z.array(CloseApproachCandidateSchema).max(200)
            .parse(rawSource.candidates),
        };
    const result = emptyResult(domain, source.complete ? "ok" : "incomplete");
    result.candidateCount = source.candidates.length;
    if (!source.complete) {
      await store.failLease({ domain, owner, errorCode: "source_incomplete" });
      return result;
    }

    const afterId = continuation?.afterId ?? null;
    const page = await store.listEnabledWatchesPage({
      domain,
      afterId,
      limit: dependencies.watchPageSize ?? DEFAULT_WATCH_PAGE_SIZE,
    });
    for (const watch of page.watches) {
      if (domain === "space_weather") {
        const config = SpaceWeatherWatchConfigSchema.safeParse(watch.config);
        if (!config.success) {
          result.skippedWatches += 1;
          continue;
        }
        await recordWeatherMatches(
          watch,
          config.data,
          source.candidates as SpaceWeatherEvaluatorCandidate[],
          store,
          result,
        );
      } else {
        const config = CloseApproachWatchConfigSchema.safeParse(watch.config);
        if (!config.success) {
          result.skippedWatches += 1;
          continue;
        }
        await recordApproachMatches(
          watch,
          config.data,
          source.candidates as CloseApproachEvaluatorCandidate[],
          now,
          store,
          result,
        );
      }
      result.processedWatches += 1;
    }

    const lastId = page.watches.at(-1)?.id;
    if (page.hasMore && lastId !== undefined) {
      result.continuation = encodeContinuation(lastId, owner);
    } else {
      await store.completeLease({ domain, owner, watermark: now.toISOString() });
    }
    return result;
  } catch (error) {
    await store.failLease({ domain, owner, errorCode: "evaluation_failed" });
    throw error;
  }
}
