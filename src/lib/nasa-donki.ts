import {
  SPACE_WEATHER_EVENT_TYPES,
  SpaceWeatherEventType,
  SpaceWeatherSeverity,
  SolarFlareEvent,
  CMEEvent,
  GSTEvent,
  IPSEvent,
  HSSEvent,
  SEPEvent,
  AnySpaceWeatherEvent,
  SpaceWeatherQueryParams,
  SpaceWeatherListResponse,
  SpaceWeatherNotification,
  SpaceWeatherNotificationsListResponse,
  SpaceWeatherNotificationsQueryParams,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS, getCached, setCached } from "./cache";
import { sanitizeExternalHttpUrl } from "./safe-url";

const DONKI_CCMC_BASE_URL = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get";
const DONKI_NASA_BASE_URL = "https://api.nasa.gov/DONKI";

const API_TIMEOUT_MS = 8000;
const DEFAULT_DAYS_BACK = 45;
const MAX_EVENT_WINDOW_DAYS = 60;
const DEFAULT_NOTIFICATION_DAYS_BACK = 7;
const NOTIFICATIONS_MAX_WINDOW_DAYS = 30;
const RETRY_COUNT = 0;
const RETRY_BASE_DELAY_MS = 300;
const RETRY_JITTER_MS = 250;
const STALE_EVENT_MAX_AGE_SECONDS = CACHE_TTL.SPACE_WEATHER * 4;
const STALE_EVENT_MAX_AGE_MS = STALE_EVENT_MAX_AGE_SECONDS * 1000;
const STALE_NOTIFICATION_MAX_AGE_SECONDS = CACHE_TTL.SPACE_WEATHER_NOTIFICATIONS * 6;
const STALE_NOTIFICATION_MAX_AGE_MS = STALE_NOTIFICATION_MAX_AGE_SECONDS * 1000;
const NOTIFICATIONS_TIMEOUT_MS = 6000;
const NOTIFICATIONS_RETRY_COUNT = 0;
const DONKI_BASE_COOLDOWN_SECONDS = 120;
const DONKI_BASE_COOLDOWN_MS = DONKI_BASE_COOLDOWN_SECONDS * 1000;
const SPACE_WEATHER_FETCH_CONCURRENCY = 4;
const MAX_META_WARNINGS = 8;

export const SPACE_WEATHER_MAX_TOTAL_RESULTS = 420;
export const SPACE_WEATHER_NOTIFICATIONS_MAX_TOTAL_RESULTS = 300;

let hasWarnedMissingNasaApiKey = false;
const CACHE_VERSION = 3;

const SINGLE_FLIGHT = new Map<string, Promise<unknown>>();
const STALE_EVENTS = new Map<string, StaleEventsEnvelope>();
const STALE_NOTIFICATIONS = new Map<string, StaleNotificationsEnvelope>();
const DONKI_BASE_COOLDOWNS = new Map<string, number>();

export class DonkiUpstreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DonkiUpstreamUnavailableError";
  }
}

interface DonkiTypeFetchResult {
  type: SpaceWeatherEventType;
  events: AnySpaceWeatherEvent[];
  failed: boolean;
  failureMessage?: string;
  staleFallback?: boolean;
}

interface RawLinkedEvent {
  activityID: string;
  [key: string]: unknown;
}

interface RawInstrument {
  displayName?: string;
}

interface RawSentNotification {
  messageID?: string;
  messageIssueTime?: string;
  messageURL?: string;
}

interface RawFLR {
  flrID: string;
  beginTime: string;
  peakTime?: string;
  endTime?: string;
  classType: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  linkedEvents?: RawLinkedEvent[] | null;
}

interface RawCMEAnalysis {
  speed?: number;
  halfAngle?: number;
  type?: string;
  isMostAccurate?: boolean;
}

interface RawCME {
  activityID: string;
  startTime: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  cmeAnalyses?: RawCMEAnalysis[] | null;
  linkedEvents?: RawLinkedEvent[] | null;
}

interface RawKpIndex {
  observedTime: string;
  kpIndex: number;
  source: string;
}

interface RawGST {
  gstID: string;
  startTime: string;
  allKpIndex?: RawKpIndex[] | null;
  linkedEvents?: RawLinkedEvent[] | null;
}

interface RawIPS {
  activityID: string;
  eventTime: string;
  location?: string;
  submissionTime?: string;
  link?: string;
  instruments?: RawInstrument[] | null;
  linkedEvents?: RawLinkedEvent[] | null;
  sentNotifications?: RawSentNotification[] | null;
}

interface RawHSS {
  hssID: string;
  eventTime: string;
  submissionTime?: string;
  link?: string;
  instruments?: RawInstrument[] | null;
  linkedEvents?: RawLinkedEvent[] | null;
  sentNotifications?: RawSentNotification[] | null;
}

interface RawSEP {
  sepID: string;
  eventTime: string;
  submissionTime?: string;
  link?: string;
  instruments?: RawInstrument[] | null;
  linkedEvents?: RawLinkedEvent[] | null;
  sentNotifications?: RawSentNotification[] | null;
}

interface RawNotification {
  messageType?: string;
  messageID?: string;
  messageURL?: string;
  messageIssueTime?: string;
  messageBody?: string;
}

interface NotificationWindow {
  requestedStart: string;
  requestedEnd: string;
  effectiveStart: string;
  effectiveEnd: string;
  warnings: string[];
}

interface EventWindow {
  requestedStart: string;
  requestedEnd: string;
  effectiveStart: string;
  effectiveEnd: string;
  warnings: string[];
}

interface NotificationCacheValue {
  notifications: SpaceWeatherNotification[];
  sawUnknownType: boolean;
}

interface StaleEventsEnvelope {
  cachedAt: number;
  events: AnySpaceWeatherEvent[];
}

interface StaleNotificationsEnvelope {
  cachedAt: number;
  value: NotificationCacheValue;
}

function randomJitterMs(): number {
  return Math.floor(Math.random() * RETRY_JITTER_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withSingleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = SINGLE_FLIGHT.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = fn().finally(() => {
    SINGLE_FLIGHT.delete(key);
  });

  SINGLE_FLIGHT.set(key, pending as Promise<unknown>);
  return pending;
}

function isEnvelopeExpired(cachedAt: number, maxAgeMs: number): boolean {
  return Date.now() - cachedAt > maxAgeMs;
}

function readStaleEvents<T extends AnySpaceWeatherEvent>(key: string): T[] | null {
  const cached = STALE_EVENTS.get(key);
  if (!cached) return null;

  if (isEnvelopeExpired(cached.cachedAt, STALE_EVENT_MAX_AGE_MS)) {
    STALE_EVENTS.delete(key);
    return null;
  }

  return cached.events as T[];
}

function writeStaleEvents<T extends AnySpaceWeatherEvent>(key: string, events: T[], cachedAt = Date.now()): void {
  const now = Date.now();
  for (const [cacheKey, cached] of STALE_EVENTS.entries()) {
    if (now - cached.cachedAt > STALE_EVENT_MAX_AGE_MS) {
      STALE_EVENTS.delete(cacheKey);
    }
  }

  STALE_EVENTS.set(key, {
    cachedAt,
    events,
  });
}

function toDistributedStaleCacheKey(key: string): string {
  return `${key}:stale`;
}

function coerceStaleEventsEnvelope(
  value: StaleEventsEnvelope | AnySpaceWeatherEvent[] | null,
): StaleEventsEnvelope | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return { cachedAt: Date.now(), events: value };
  }

  if (!Array.isArray(value.events) || typeof value.cachedAt !== "number") {
    return null;
  }

  if (isEnvelopeExpired(value.cachedAt, STALE_EVENT_MAX_AGE_MS)) {
    return null;
  }

  return value;
}

async function readDistributedStaleEventsEnvelope(key: string): Promise<StaleEventsEnvelope | null> {
  const cached = await getCached<StaleEventsEnvelope | AnySpaceWeatherEvent[]>(toDistributedStaleCacheKey(key));
  return coerceStaleEventsEnvelope(cached);
}

async function writeDistributedStaleEvents<T extends AnySpaceWeatherEvent>(
  key: string,
  events: T[],
  cachedAt = Date.now(),
): Promise<void> {
  await setCached(
    toDistributedStaleCacheKey(key),
    { cachedAt, events } satisfies StaleEventsEnvelope,
    STALE_EVENT_MAX_AGE_SECONDS,
  );
}

async function getStaleFallback<T extends AnySpaceWeatherEvent>(key: string): Promise<T[] | null> {
  const inMemory = readStaleEvents<T>(key);
  if (inMemory) return inMemory;

  const distributed = await readDistributedStaleEventsEnvelope(key);
  if (distributed) {
    writeStaleEvents(key, distributed.events as T[], distributed.cachedAt);
    return distributed.events as T[];
  }

  return null;
}

function readStaleNotifications(key: string): NotificationCacheValue | null {
  const cached = STALE_NOTIFICATIONS.get(key);
  if (!cached) return null;

  if (isEnvelopeExpired(cached.cachedAt, STALE_NOTIFICATION_MAX_AGE_MS)) {
    STALE_NOTIFICATIONS.delete(key);
    return null;
  }

  return cached.value;
}

function writeStaleNotifications(key: string, value: NotificationCacheValue, cachedAt = Date.now()): void {
  const now = Date.now();
  for (const [cacheKey, cached] of STALE_NOTIFICATIONS.entries()) {
    if (now - cached.cachedAt > STALE_NOTIFICATION_MAX_AGE_MS) {
      STALE_NOTIFICATIONS.delete(cacheKey);
    }
  }

  STALE_NOTIFICATIONS.set(key, {
    cachedAt,
    value,
  });
}

function coerceStaleNotificationsEnvelope(
  value: StaleNotificationsEnvelope | NotificationCacheValue | null,
): StaleNotificationsEnvelope | null {
  if (!value) return null;

  if (
    "notifications" in value &&
    Array.isArray(value.notifications) &&
    typeof value.sawUnknownType === "boolean"
  ) {
    return {
      cachedAt: Date.now(),
      value: {
        notifications: value.notifications,
        sawUnknownType: value.sawUnknownType,
      },
    };
  }

  if (
    !("value" in value) ||
    typeof value.cachedAt !== "number" ||
    !Array.isArray(value.value.notifications) ||
    typeof value.value.sawUnknownType !== "boolean"
  ) {
    return null;
  }

  if (isEnvelopeExpired(value.cachedAt, STALE_NOTIFICATION_MAX_AGE_MS)) {
    return null;
  }

  return value;
}

async function readDistributedStaleNotificationsEnvelope(key: string): Promise<StaleNotificationsEnvelope | null> {
  const cached = await getCached<StaleNotificationsEnvelope | NotificationCacheValue>(
    toDistributedStaleCacheKey(key),
  );
  return coerceStaleNotificationsEnvelope(cached);
}

async function writeDistributedStaleNotifications(
  key: string,
  value: NotificationCacheValue,
  cachedAt = Date.now(),
): Promise<void> {
  await setCached(
    toDistributedStaleCacheKey(key),
    { cachedAt, value } satisfies StaleNotificationsEnvelope,
    STALE_NOTIFICATION_MAX_AGE_SECONDS,
  );
}

async function getStaleNotificationsFallback(key: string): Promise<NotificationCacheValue | null> {
  const inMemory = readStaleNotifications(key);
  if (inMemory) return inMemory;

  const distributed = await readDistributedStaleNotificationsEnvelope(key);
  if (distributed) {
    writeStaleNotifications(key, distributed.value, distributed.cachedAt);
    return distributed.value;
  }

  return null;
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromUtcDateString(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function addDaysUtc(date: string, days: number): string {
  const d = fromUtcDateString(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toUtcDateString(d);
}

function getTodayUtcDate(): string {
  return toUtcDateString(new Date());
}

function normalizeNullableArray<T>(value: T[] | null | undefined): T[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  return value;
}

function getNasaApiKey(): string | undefined {
  const value = process.env.NASA_API_KEY?.trim();
  return value && value.length > 0 ? value : undefined;
}

function warnMissingNasaApiKey(message: string): void {
  if (process.env.NODE_ENV !== "production" || hasWarnedMissingNasaApiKey) return;
  hasWarnedMissingNasaApiKey = true;
  console.warn(message);
}

function getDonkiBaseCandidates(): string[] {
  if (getNasaApiKey()) {
    return [DONKI_NASA_BASE_URL, DONKI_CCMC_BASE_URL];
  }

  warnMissingNasaApiKey(
    "[DONKI] NASA_API_KEY is not configured in production; preferring CCMC DONKI endpoint.",
  );
  return [DONKI_CCMC_BASE_URL, DONKI_NASA_BASE_URL];
}

function getCacheContext(): string {
  const env = process.env.NODE_ENV || "unknown";
  return `${env}:donki`;
}

function getDonkiBaseId(baseUrl: string): "nasa" | "ccmc" {
  return baseUrl.includes("api.nasa.gov") ? "nasa" : "ccmc";
}

function getDonkiCooldownKey(baseUrl: string, endpoint: string): string {
  const normalizedEndpoint = endpoint.trim().toLowerCase();
  return `sw:donki-cooldown:v1:${getDonkiBaseId(baseUrl)}:${normalizedEndpoint}`;
}

function setLocalCooldown(cooldownKey: string, expiresAt: number): void {
  const now = Date.now();
  for (const [key, localExpiresAt] of DONKI_BASE_COOLDOWNS.entries()) {
    if (localExpiresAt <= now) {
      DONKI_BASE_COOLDOWNS.delete(key);
    }
  }

  DONKI_BASE_COOLDOWNS.set(cooldownKey, expiresAt);
}

async function isBaseInCooldown(cooldownKey: string): Promise<boolean> {
  const local = DONKI_BASE_COOLDOWNS.get(cooldownKey);
  if (typeof local === "number") {
    if (local > Date.now()) {
      return true;
    }
    DONKI_BASE_COOLDOWNS.delete(cooldownKey);
  }

  const distributed = await getCached<{ expiresAt?: number }>(cooldownKey);
  const distributedExpiresAt = typeof distributed?.expiresAt === "number" ? distributed.expiresAt : undefined;
  if (distributedExpiresAt && distributedExpiresAt > Date.now()) {
    setLocalCooldown(cooldownKey, distributedExpiresAt);
    return true;
  }

  return false;
}

async function setBaseCooldown(cooldownKey: string): Promise<void> {
  const expiresAt = Date.now() + DONKI_BASE_COOLDOWN_MS;
  setLocalCooldown(cooldownKey, expiresAt);
  await setCached(cooldownKey, { expiresAt }, DONKI_BASE_COOLDOWN_SECONDS);
}

function finalizeWarnings(warnings: string[]): string[] | undefined {
  if (warnings.length === 0) return undefined;

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const warning of warnings) {
    const value = warning.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
    if (normalized.length >= MAX_META_WARNINGS) break;
  }

  return normalized.length > 0 ? normalized : undefined;
}

async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const maxConcurrency = Math.max(1, Math.min(concurrency, tasks.length));
  const results = new Array<T>(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= tasks.length) {
        return;
      }
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  await Promise.all(Array.from({ length: maxConcurrency }, () => worker()));
  return results;
}

function buildUrlWithBase(
  baseUrl: string,
  endpoint: string,
  startDate: string,
  endDate: string,
  extraParams?: Record<string, string>,
): string {
  const url = new URL(`${baseUrl}/${endpoint}`);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const nasaApiKey = getNasaApiKey();
  if (baseUrl.includes("api.nasa.gov") && nasaApiKey) {
    url.searchParams.set("api_key", nasaApiKey);
  }

  return url.toString();
}

function toEpochFromEvent(event: AnySpaceWeatherEvent): number {
  const direct = Date.parse(event.startTime);
  if (!Number.isNaN(direct)) return direct;

  const fromId = Date.parse(event.id.split("-").slice(0, 3).join("-") + "Z");
  if (!Number.isNaN(fromId)) return fromId;

  return Number.MIN_SAFE_INTEGER;
}

function getEventCompletenessScore(event: AnySpaceWeatherEvent): number {
  let score = 0;
  for (const value of Object.values(event)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length > 0) score += 1;
      continue;
    }

    if (typeof value === "string") {
      if (value.trim().length > 0) score += 1;
      continue;
    }

    score += 1;
  }

  return score;
}

export function dedupeSpaceWeatherEvents(
  events: AnySpaceWeatherEvent[],
): AnySpaceWeatherEvent[] {
  const byId = new Map<string, AnySpaceWeatherEvent>();

  for (const event of events) {
    const normalizedId = event.id.trim();
    const dedupeId = normalizedId.length > 0 ? normalizedId : event.id;
    const normalizedEvent = normalizedId.length > 0 && normalizedId !== event.id
      ? { ...event, id: normalizedId }
      : event;

    const existing = byId.get(dedupeId);
    if (!existing) {
      byId.set(dedupeId, normalizedEvent);
      continue;
    }

    if (getEventCompletenessScore(normalizedEvent) > getEventCompletenessScore(existing)) {
      byId.set(dedupeId, normalizedEvent);
    }
  }

  return Array.from(byId.values());
}

export function normalizeSpaceWeatherResultSet(
  events: AnySpaceWeatherEvent[],
  limit: number,
  page?: number,
): {
  events: AnySpaceWeatherEvent[];
  totalAvailable: number;
  totalCapApplied: boolean;
  duplicateCount: number;
} {
  const deduped = dedupeSpaceWeatherEvents(events);
  const duplicateCount = events.length - deduped.length;

  const sorted = [...deduped].sort((a, b) => {
    const tsDiff = toEpochFromEvent(b) - toEpochFromEvent(a);
    if (tsDiff !== 0) return tsDiff;
    return b.id.localeCompare(a.id);
  });

  const capped = sorted.slice(0, SPACE_WEATHER_MAX_TOTAL_RESULTS);
  const totalAvailable = capped.length;
  const totalCapApplied = sorted.length > SPACE_WEATHER_MAX_TOTAL_RESULTS;

  if (typeof page === "number") {
    const start = (page - 1) * limit;
    return {
      events: capped.slice(start, start + limit),
      totalAvailable,
      totalCapApplied,
      duplicateCount,
    };
  }

  return {
    events: capped.slice(0, limit),
    totalAvailable,
    totalCapApplied,
    duplicateCount,
  };
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes("timed out")) return true;
  if (message.includes("fetch failed")) return true;
  if (message.includes("etimedout")) return true;
  if (message.includes("donki api error: 5")) return true;
  return false;
}

interface FetchRetryOptions {
  timeoutMs?: number;
  retryCount?: number;
}

interface DonkiFetchWithSourceResult<T> {
  data: T;
  sourceBaseUrl: string;
  usedFallbackBase: boolean;
}

async function fetchWithTimeout<T>(url: string, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DONKI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request to DONKI API timed out");
    }

    throw error;
  }
}

async function fetchWithRetry<T>(url: string, options: FetchRetryOptions = {}): Promise<T> {
  const retryCount = options.retryCount ?? RETRY_COUNT;
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retryCount) {
    try {
      return await fetchWithTimeout<T>(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= retryCount || !isRetryableError(error)) {
        throw error;
      }

      const delayMs = RETRY_BASE_DELAY_MS + randomJitterMs();
      await sleep(delayMs);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("DONKI request failed");
}

async function fetchDonkiWithBaseFailover<T>(
  endpoint: string,
  startDate: string,
  endDate: string,
  extraParams: Record<string, string> | undefined,
  options: FetchRetryOptions = {},
): Promise<DonkiFetchWithSourceResult<T>> {
  const baseCandidates = getDonkiBaseCandidates();
  let lastError: unknown;
  let attemptedBaseCount = 0;

  for (let index = 0; index < baseCandidates.length; index += 1) {
    const baseUrl = baseCandidates[index];
    const cooldownKey = getDonkiCooldownKey(baseUrl, endpoint);
    if (await isBaseInCooldown(cooldownKey)) {
      console.warn(`[DONKI] Skipping ${endpoint} on ${baseUrl} due to active cooldown.`);
      continue;
    }

    attemptedBaseCount += 1;
    const url = buildUrlWithBase(baseUrl, endpoint, startDate, endDate, extraParams);

    try {
      const data = await fetchWithRetry<T>(url, options);
      return {
        data,
        sourceBaseUrl: baseUrl,
        usedFallbackBase: index > 0,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) {
        throw error;
      }

      const hasFallback = index < baseCandidates.length - 1;
      if (hasFallback) {
        await setBaseCooldown(cooldownKey);
      }
      if (!hasFallback) {
        continue;
      }

      console.warn(
        `[DONKI] Base failover for ${endpoint}: primary ${baseUrl} failed (${getFetchFailureMessage(error)}).`,
      );
    }
  }

  if (attemptedBaseCount === 0) {
    throw new Error(`DONKI ${endpoint} requests skipped while all base endpoints are cooling down.`);
  }

  throw lastError instanceof Error ? lastError : new Error("DONKI request failed");
}

function getFetchFailureMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown upstream error";
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    const code = (cause as { code?: unknown }).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return `${error.message} (${code})`;
    }
  }
  return error.message;
}

function normalizeInstruments(instruments: RawInstrument[] | null | undefined): string[] | undefined {
  if (!Array.isArray(instruments) || instruments.length === 0) return undefined;

  const names = instruments
    .map((instrument) => instrument.displayName?.trim())
    .filter((value): value is string => !!value && value.length > 0);

  return names.length > 0 ? names : undefined;
}

function logSourceFetch(source: string, startedAt: number, rowCount: number): void {
  const latencyMs = Date.now() - startedAt;
  console.info(`[DONKI] source=${source} status=ok latency_ms=${latencyMs} rows=${rowCount}`);
}

async function fetchSolarFlaresRaw(startDate: string, endDate: string): Promise<DonkiTypeFetchResult> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_FLR}:v${CACHE_VERSION}:${getCacheContext()}:${startDate}:${endDate}`;
  const startedAt = Date.now();

  try {
    const events = await withSingleFlight(
      cacheKey,
      async () =>
        withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
          const fetched = await fetchDonkiWithBaseFailover<RawFLR[]>(
            "FLR",
            startDate,
            endDate,
            undefined,
          );
          const data = fetched.data;
          if (fetched.usedFallbackBase) {
            console.warn(`[DONKI] FLR served from fallback base ${fetched.sourceBaseUrl}.`);
          }

          if (!Array.isArray(data)) {
            console.warn("[DONKI] FLR endpoint returned non-array:", typeof data);
            return [];
          }

          return data.map((flr): SolarFlareEvent => ({
            id: flr.flrID,
            eventType: "FLR",
            startTime: flr.beginTime,
            peakTime: flr.peakTime,
            endTime: flr.endTime,
            classType: flr.classType,
            sourceLocation: flr.sourceLocation,
            activeRegionNum: flr.activeRegionNum,
            linkedEvents: normalizeNullableArray(flr.linkedEvents),
          }));
        }),
    );

    const cachedAt = Date.now();
    writeStaleEvents(cacheKey, events, cachedAt);
    void writeDistributedStaleEvents(cacheKey, events, cachedAt);
    logSourceFetch("FLR", startedAt, events.length);
    return { type: "FLR", events, failed: false };
  } catch (error) {
    const staleEvents = await getStaleFallback<SolarFlareEvent>(cacheKey);
    if (staleEvents) {
      console.warn("[DONKI] Using stale FLR cache after upstream failure.");
      return { type: "FLR", events: staleEvents, failed: false, staleFallback: true };
    }

    console.error("[DONKI] Failed to fetch solar flares:", error);
    return {
      type: "FLR",
      events: [],
      failed: true,
      failureMessage: getFetchFailureMessage(error),
    };
  }
}

async function fetchCMEsRaw(startDate: string, endDate: string): Promise<DonkiTypeFetchResult> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_CME}:v${CACHE_VERSION}:${getCacheContext()}:${startDate}:${endDate}`;
  const startedAt = Date.now();

  try {
    const events = await withSingleFlight(
      cacheKey,
      async () =>
        withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
          const fetched = await fetchDonkiWithBaseFailover<RawCME[]>(
            "CME",
            startDate,
            endDate,
            undefined,
          );
          const data = fetched.data;
          if (fetched.usedFallbackBase) {
            console.warn(`[DONKI] CME served from fallback base ${fetched.sourceBaseUrl}.`);
          }

          if (!Array.isArray(data)) {
            console.warn("[DONKI] CME endpoint returned non-array:", typeof data);
            return [];
          }

          return data.map((cme): CMEEvent => {
            const analyses = normalizeNullableArray(cme.cmeAnalyses) ?? [];
            const analysis = analyses.find((item) => item.isMostAccurate) ?? analyses[0];

            return {
              id: cme.activityID,
              eventType: "CME",
              startTime: cme.startTime,
              sourceLocation: cme.sourceLocation,
              activeRegionNum: cme.activeRegionNum,
              speed: analysis?.speed,
              halfAngle: analysis?.halfAngle,
              cmeType: analysis?.type,
              linkedEvents: normalizeNullableArray(cme.linkedEvents),
            };
          });
        }),
    );

    const cachedAt = Date.now();
    writeStaleEvents(cacheKey, events, cachedAt);
    void writeDistributedStaleEvents(cacheKey, events, cachedAt);
    logSourceFetch("CME", startedAt, events.length);
    return { type: "CME", events, failed: false };
  } catch (error) {
    const staleEvents = await getStaleFallback<CMEEvent>(cacheKey);
    if (staleEvents) {
      console.warn("[DONKI] Using stale CME cache after upstream failure.");
      return { type: "CME", events: staleEvents, failed: false, staleFallback: true };
    }

    console.error("[DONKI] Failed to fetch CMEs:", error);
    return {
      type: "CME",
      events: [],
      failed: true,
      failureMessage: getFetchFailureMessage(error),
    };
  }
}

async function fetchGSTsRaw(startDate: string, endDate: string): Promise<DonkiTypeFetchResult> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_GST}:v${CACHE_VERSION}:${getCacheContext()}:${startDate}:${endDate}`;
  const startedAt = Date.now();

  try {
    const events = await withSingleFlight(
      cacheKey,
      async () =>
        withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
          const fetched = await fetchDonkiWithBaseFailover<RawGST[]>(
            "GST",
            startDate,
            endDate,
            undefined,
          );
          const data = fetched.data;
          if (fetched.usedFallbackBase) {
            console.warn(`[DONKI] GST served from fallback base ${fetched.sourceBaseUrl}.`);
          }

          if (!Array.isArray(data)) {
            console.warn("[DONKI] GST endpoint returned non-array:", typeof data);
            return [];
          }

          return data.map((gst): GSTEvent => {
            const allKpReadings = (normalizeNullableArray(gst.allKpIndex) ?? []).map((kp) => ({
              observedTime: kp.observedTime,
              kpIndex: kp.kpIndex,
              source: kp.source,
            }));

            const maxKp = allKpReadings.length > 0
              ? Math.max(...allKpReadings.map((reading) => reading.kpIndex))
              : 0;

            return {
              id: gst.gstID,
              eventType: "GST",
              startTime: gst.startTime,
              kpIndex: maxKp,
              allKpReadings,
              linkedEvents: normalizeNullableArray(gst.linkedEvents),
            };
          });
        }),
    );

    const cachedAt = Date.now();
    writeStaleEvents(cacheKey, events, cachedAt);
    void writeDistributedStaleEvents(cacheKey, events, cachedAt);
    logSourceFetch("GST", startedAt, events.length);
    return { type: "GST", events, failed: false };
  } catch (error) {
    const staleEvents = await getStaleFallback<GSTEvent>(cacheKey);
    if (staleEvents) {
      console.warn("[DONKI] Using stale GST cache after upstream failure.");
      return { type: "GST", events: staleEvents, failed: false, staleFallback: true };
    }

    console.error("[DONKI] Failed to fetch geomagnetic storms:", error);
    return {
      type: "GST",
      events: [],
      failed: true,
      failureMessage: getFetchFailureMessage(error),
    };
  }
}

async function fetchIPSRaw(startDate: string, endDate: string): Promise<DonkiTypeFetchResult> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_IPS}:v${CACHE_VERSION}:${getCacheContext()}:${startDate}:${endDate}`;
  const startedAt = Date.now();

  try {
    const events = await withSingleFlight(
      cacheKey,
      async () =>
        withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
          const fetched = await fetchDonkiWithBaseFailover<RawIPS[]>(
            "IPS",
            startDate,
            endDate,
            undefined,
          );
          const data = fetched.data;
          if (fetched.usedFallbackBase) {
            console.warn(`[DONKI] IPS served from fallback base ${fetched.sourceBaseUrl}.`);
          }

          if (!Array.isArray(data)) {
            console.warn("[DONKI] IPS endpoint returned non-array:", typeof data);
            return [];
          }

          return data.map((ips): IPSEvent => ({
            id: ips.activityID,
            eventType: "IPS",
            startTime: ips.eventTime,
            location: ips.location,
            submissionTime: ips.submissionTime,
            instruments: normalizeInstruments(ips.instruments),
            sourceLink: sanitizeExternalHttpUrl(ips.link),
            linkedEvents: normalizeNullableArray(ips.linkedEvents),
          }));
        }),
    );

    const cachedAt = Date.now();
    writeStaleEvents(cacheKey, events, cachedAt);
    void writeDistributedStaleEvents(cacheKey, events, cachedAt);
    logSourceFetch("IPS", startedAt, events.length);
    return { type: "IPS", events, failed: false };
  } catch (error) {
    const staleEvents = await getStaleFallback<IPSEvent>(cacheKey);
    if (staleEvents) {
      console.warn("[DONKI] Using stale IPS cache after upstream failure.");
      return { type: "IPS", events: staleEvents, failed: false, staleFallback: true };
    }

    console.error("[DONKI] Failed to fetch interplanetary shocks:", error);
    return {
      type: "IPS",
      events: [],
      failed: true,
      failureMessage: getFetchFailureMessage(error),
    };
  }
}

async function fetchHSSRaw(startDate: string, endDate: string): Promise<DonkiTypeFetchResult> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_HSS}:v${CACHE_VERSION}:${getCacheContext()}:${startDate}:${endDate}`;
  const startedAt = Date.now();

  try {
    const events = await withSingleFlight(
      cacheKey,
      async () =>
        withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
          const fetched = await fetchDonkiWithBaseFailover<RawHSS[]>(
            "HSS",
            startDate,
            endDate,
            undefined,
          );
          const data = fetched.data;
          if (fetched.usedFallbackBase) {
            console.warn(`[DONKI] HSS served from fallback base ${fetched.sourceBaseUrl}.`);
          }

          if (!Array.isArray(data)) {
            console.warn("[DONKI] HSS endpoint returned non-array:", typeof data);
            return [];
          }

          return data.map((hss): HSSEvent => ({
            id: hss.hssID,
            eventType: "HSS",
            startTime: hss.eventTime,
            submissionTime: hss.submissionTime,
            instruments: normalizeInstruments(hss.instruments),
            sourceLink: sanitizeExternalHttpUrl(hss.link),
            linkedEvents: normalizeNullableArray(hss.linkedEvents),
          }));
        }),
    );

    const cachedAt = Date.now();
    writeStaleEvents(cacheKey, events, cachedAt);
    void writeDistributedStaleEvents(cacheKey, events, cachedAt);
    logSourceFetch("HSS", startedAt, events.length);
    return { type: "HSS", events, failed: false };
  } catch (error) {
    const staleEvents = await getStaleFallback<HSSEvent>(cacheKey);
    if (staleEvents) {
      console.warn("[DONKI] Using stale HSS cache after upstream failure.");
      return { type: "HSS", events: staleEvents, failed: false, staleFallback: true };
    }

    console.error("[DONKI] Failed to fetch high-speed streams:", error);
    return {
      type: "HSS",
      events: [],
      failed: true,
      failureMessage: getFetchFailureMessage(error),
    };
  }
}

async function fetchSEPRaw(startDate: string, endDate: string): Promise<DonkiTypeFetchResult> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_SEP}:v${CACHE_VERSION}:${getCacheContext()}:${startDate}:${endDate}`;
  const startedAt = Date.now();

  try {
    const events = await withSingleFlight(
      cacheKey,
      async () =>
        withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
          const fetched = await fetchDonkiWithBaseFailover<RawSEP[]>(
            "SEP",
            startDate,
            endDate,
            undefined,
          );
          const data = fetched.data;
          if (fetched.usedFallbackBase) {
            console.warn(`[DONKI] SEP served from fallback base ${fetched.sourceBaseUrl}.`);
          }

          if (!Array.isArray(data)) {
            console.warn("[DONKI] SEP endpoint returned non-array:", typeof data);
            return [];
          }

          return data.map((sep): SEPEvent => ({
            id: sep.sepID,
            eventType: "SEP",
            startTime: sep.eventTime,
            submissionTime: sep.submissionTime,
            instruments: normalizeInstruments(sep.instruments),
            sourceLink: sanitizeExternalHttpUrl(sep.link),
            linkedEvents: normalizeNullableArray(sep.linkedEvents),
          }));
        }),
    );

    const cachedAt = Date.now();
    writeStaleEvents(cacheKey, events, cachedAt);
    void writeDistributedStaleEvents(cacheKey, events, cachedAt);
    logSourceFetch("SEP", startedAt, events.length);
    return { type: "SEP", events, failed: false };
  } catch (error) {
    const staleEvents = await getStaleFallback<SEPEvent>(cacheKey);
    if (staleEvents) {
      console.warn("[DONKI] Using stale SEP cache after upstream failure.");
      return { type: "SEP", events: staleEvents, failed: false, staleFallback: true };
    }

    console.error("[DONKI] Failed to fetch solar energetic particle events:", error);
    return {
      type: "SEP",
      events: [],
      failed: true,
      failureMessage: getFetchFailureMessage(error),
    };
  }
}

function resolveEventWindow(startDate?: string, endDate?: string): EventWindow {
  const today = getTodayUtcDate();
  const requestedEnd = endDate ?? today;
  const requestedStart = startDate ?? addDaysUtc(requestedEnd, -DEFAULT_DAYS_BACK);

  const warnings: string[] = [];

  let effectiveEnd = requestedEnd;
  if (requestedEnd > today) {
    effectiveEnd = today;
    warnings.push(`End date cannot be in the future; using ${effectiveEnd}.`);
  }

  const maxStart = addDaysUtc(effectiveEnd, -MAX_EVENT_WINDOW_DAYS);
  let effectiveStart = requestedStart;
  if (requestedStart < maxStart) {
    effectiveStart = maxStart;
    warnings.push(
      `Space weather requests are limited to ${MAX_EVENT_WINDOW_DAYS} days; using ${effectiveStart} to ${effectiveEnd}.`,
    );
  }

  if (effectiveStart > effectiveEnd) {
    effectiveStart = effectiveEnd;
    warnings.push(`Start date exceeded end date after normalization; using ${effectiveStart}.`);
  }

  return {
    requestedStart,
    requestedEnd,
    effectiveStart,
    effectiveEnd,
    warnings,
  };
}

function resolveNotificationWindow(startDate?: string, endDate?: string): NotificationWindow {
  const today = getTodayUtcDate();
  const requestedEnd = endDate ?? today;
  const defaultStart = addDaysUtc(requestedEnd, -DEFAULT_NOTIFICATION_DAYS_BACK);
  const requestedStart = startDate ?? defaultStart;

  const warnings: string[] = [];
  let effectiveEnd = requestedEnd;
  if (requestedEnd > today) {
    effectiveEnd = today;
    warnings.push(`End date cannot be in the future; using ${effectiveEnd}.`);
  }

  const maxStart = addDaysUtc(effectiveEnd, -NOTIFICATIONS_MAX_WINDOW_DAYS);

  let effectiveStart = requestedStart;
  if (requestedStart < maxStart) {
    effectiveStart = maxStart;
    warnings.push(
      `Notifications are limited to ${NOTIFICATIONS_MAX_WINDOW_DAYS} days; using ${effectiveStart} to ${effectiveEnd}.`,
    );
  }

  if (effectiveStart > effectiveEnd) {
    effectiveStart = effectiveEnd;
  }

  return {
    requestedStart,
    requestedEnd,
    effectiveStart,
    effectiveEnd,
    warnings,
  };
}

function normalizeNotificationType(value: string | undefined): SpaceWeatherNotification["type"] {
  switch (value?.toUpperCase()) {
    case "FLR":
      return "FLR";
    case "SEP":
      return "SEP";
    case "CME":
      return "CME";
    case "IPS":
      return "IPS";
    case "GST":
      return "GST";
    default:
      return "other";
  }
}

function extractActivityIDs(messageBody: string): string[] {
  const matches = messageBody.match(
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-(?:FLR|CME|GST|IPS|HSS|SEP|MPC|RBE)-\d{3}\b/g,
  );

  if (!matches) return [];
  return Array.from(new Set(matches));
}

export async function fetchSpaceWeatherNotifications(
  params: SpaceWeatherNotificationsQueryParams = {},
): Promise<SpaceWeatherNotificationsListResponse> {
  const type = params.type ?? "all";
  const page = params.page;
  const limit = params.limit ?? 20;
  const window = resolveNotificationWindow(params.startDate, params.endDate);
  const warnings = [...window.warnings];

  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_NOTIFICATIONS}:v${CACHE_VERSION}:${getCacheContext()}:${window.effectiveStart}:${window.effectiveEnd}:${type}`;

  let cachedResult: NotificationCacheValue;
  let usedStaleFallback = false;
  try {
    cachedResult = await withSingleFlight(
      cacheKey,
      async () =>
        withCache(cacheKey, CACHE_TTL.SPACE_WEATHER_NOTIFICATIONS, async (): Promise<NotificationCacheValue> => {
          const startedAt = Date.now();
          const fetched = await fetchDonkiWithBaseFailover<RawNotification[]>(
            "notifications",
            window.effectiveStart,
            window.effectiveEnd,
            { type },
            {
              timeoutMs: NOTIFICATIONS_TIMEOUT_MS,
              retryCount: NOTIFICATIONS_RETRY_COUNT,
            },
          );

          const data = fetched.data;
          if (fetched.usedFallbackBase) {
            console.warn(
              `[DONKI] notifications served from fallback base ${fetched.sourceBaseUrl}.`,
            );
          }
          const dataSource = fetched.sourceBaseUrl.includes("api.nasa.gov") ? "nasa" : "ccmc";

          if (!Array.isArray(data)) {
            console.warn("[DONKI] notifications endpoint returned non-array:", typeof data);
            return { notifications: [], sawUnknownType: false };
          }

          const notifications: SpaceWeatherNotification[] = [];
          let sawUnknownType = false;

          for (const entry of data) {
            const messageID = entry.messageID?.trim();
            if (!messageID) continue;

            const body = entry.messageBody?.trim() ?? "";
            const normalizedType = normalizeNotificationType(entry.messageType);
            if (normalizedType === "other") {
              sawUnknownType = true;
            }

            notifications.push({
              id: messageID,
              type: normalizedType,
              issuedAt: entry.messageIssueTime ?? "",
              url: sanitizeExternalHttpUrl(entry.messageURL),
              body,
              activityIDs: extractActivityIDs(body),
            });
          }

          const latencyMs = Date.now() - startedAt;
          console.info(
            `[DONKI] source=notifications status=ok latency_ms=${latencyMs} rows=${notifications.length} type=${type} base=${dataSource}`,
          );

          return { notifications, sawUnknownType };
        }),
    );
    const cachedAt = Date.now();
    writeStaleNotifications(cacheKey, cachedResult, cachedAt);
    void writeDistributedStaleNotifications(cacheKey, cachedResult, cachedAt);
  } catch (error) {
    const staleResult = await getStaleNotificationsFallback(cacheKey);
    if (staleResult) {
      usedStaleFallback = true;
      cachedResult = staleResult;
      console.warn("[DONKI] Using stale notifications cache after upstream failure.");
    } else {
      console.error("[DONKI] Failed to fetch notifications:", error);
      throw new DonkiUpstreamUnavailableError(
        `DONKI notifications request failed (${getFetchFailureMessage(error)}).`,
      );
    }
  }

  if (usedStaleFallback) {
    warnings.push("Notifications are using stale cached data due to DONKI unavailability.");
  }

  if (cachedResult.sawUnknownType) {
    warnings.push("Some notification types were returned as 'other' because they are not enabled in this MVP.");
  }

  const normalizedWarnings = finalizeWarnings(warnings);

  const sorted = [...cachedResult.notifications].sort((a, b) => {
    const tsDiff = Date.parse(b.issuedAt) - Date.parse(a.issuedAt);
    if (!Number.isNaN(tsDiff) && tsDiff !== 0) return tsDiff;
    return b.id.localeCompare(a.id);
  });

  const capped = sorted.slice(0, SPACE_WEATHER_NOTIFICATIONS_MAX_TOTAL_RESULTS);
  const totalCapApplied = sorted.length > SPACE_WEATHER_NOTIFICATIONS_MAX_TOTAL_RESULTS;
  const totalAvailable = capped.length;

  const notifications = typeof page === "number"
    ? capped.slice((page - 1) * limit, (page - 1) * limit + limit)
    : capped.slice(0, limit);

  return {
    notifications,
    count: notifications.length,
    totalAvailable,
    limitApplied: limit,
    ...(typeof page === "number" ? { page } : {}),
    meta: {
      dateRange: {
        requestedStart: window.requestedStart,
        requestedEnd: window.requestedEnd,
        effectiveStart: window.effectiveStart,
        effectiveEnd: window.effectiveEnd,
      },
      typeIncluded: type,
      warnings: normalizedWarnings,
      totalCapApplied,
      totalCap: SPACE_WEATHER_NOTIFICATIONS_MAX_TOTAL_RESULTS,
    },
  };
}

export function getFlareClassSeverity(classType: string): SpaceWeatherSeverity {
  const match = classType.match(/^([ABCMX])(\d+\.?\d*)/i);
  if (!match) return "minor";

  const letter = match[1].toUpperCase();
  const number = parseFloat(match[2]);

  switch (letter) {
    case "X":
      if (number >= 10) return "extreme";
      return "severe";
    case "M":
      if (number >= 5) return "strong";
      return "moderate";
    case "C":
      return "minor";
    default:
      return "minor";
  }
}

export function getKpSeverity(kp: number): SpaceWeatherSeverity {
  if (kp >= 9) return "extreme";
  if (kp >= 8) return "severe";
  if (kp >= 7) return "strong";
  if (kp >= 6) return "moderate";
  return "minor";
}

export function getCMESeverity(speed?: number): SpaceWeatherSeverity {
  if (!speed) return "minor";
  if (speed >= 2000) return "extreme";
  if (speed >= 1500) return "severe";
  if (speed >= 1000) return "strong";
  if (speed >= 500) return "moderate";
  return "minor";
}

export function getEventTypeLabel(type: SpaceWeatherEventType): string {
  switch (type) {
    case "FLR":
      return "Solar Flare";
    case "CME":
      return "Coronal Mass Ejection";
    case "GST":
      return "Geomagnetic Storm";
    case "IPS":
      return "Interplanetary Shock";
    case "HSS":
      return "High-Speed Stream";
    case "SEP":
      return "Solar Energetic Particle Event";
  }
}

export function formatFlareClass(classType: string): string {
  return `${classType}-class`;
}

export function formatCMESpeed(speed?: number): string {
  if (!speed) return "Unknown";
  return `${Math.round(speed)} km/s`;
}

export function formatKpIndex(kp: number): string {
  const gScale = kp >= 9 ? "G5" : kp >= 8 ? "G4" : kp >= 7 ? "G3" : kp >= 6 ? "G2" : kp >= 5 ? "G1" : "";
  return gScale ? `Kp${kp} (${gScale})` : `Kp${kp}`;
}

export async function fetchSpaceWeather(
  params: SpaceWeatherQueryParams = {},
): Promise<SpaceWeatherListResponse> {
  const window = resolveEventWindow(params.startDate, params.endDate);
  const startDate = window.effectiveStart;
  const endDate = window.effectiveEnd;
  const limit = params.limit ?? 100;
  const page = params.page;

  const requestedTypesSource = params.eventTypes?.length
    ? params.eventTypes
    : [...SPACE_WEATHER_EVENT_TYPES];
  const requestedTypeSet = new Set<SpaceWeatherEventType>(requestedTypesSource);
  const requestedTypes = SPACE_WEATHER_EVENT_TYPES.filter((type) => requestedTypeSet.has(type));

  const warnings: string[] = [...window.warnings];
  const typesIncluded: SpaceWeatherEventType[] = [];
  let allEvents: AnySpaceWeatherEvent[] = [];

  const fetchTasks: Array<() => Promise<DonkiTypeFetchResult>> = requestedTypes.map((type) => {
    switch (type) {
      case "FLR":
        return () => fetchSolarFlaresRaw(startDate, endDate);
      case "CME":
        return () => fetchCMEsRaw(startDate, endDate);
      case "GST":
        return () => fetchGSTsRaw(startDate, endDate);
      case "IPS":
        return () => fetchIPSRaw(startDate, endDate);
      case "HSS":
        return () => fetchHSSRaw(startDate, endDate);
      case "SEP":
        return () => fetchSEPRaw(startDate, endDate);
    }
  });

  const results = await runWithConcurrencyLimit(fetchTasks, SPACE_WEATHER_FETCH_CONCURRENCY);
  let failedTypeCount = 0;

  for (const result of results) {
    if (result.failed) {
      failedTypeCount += 1;
      warnings.push(`${getEventTypeLabel(result.type)} data source is temporarily unavailable.`);
      continue;
    }

    typesIncluded.push(result.type);
    if (result.staleFallback) {
      warnings.push(`${getEventTypeLabel(result.type)} is using stale cached data due to DONKI unavailability.`);
    }
    if (result.events.length > 0) {
      allEvents = allEvents.concat(result.events);
    }
  }

  if (failedTypeCount === requestedTypes.length) {
    throw new DonkiUpstreamUnavailableError(
      `DONKI requests timed out or failed for all requested event types (${requestedTypes.join(", ")}).`,
    );
  }

  const normalizedResult = normalizeSpaceWeatherResultSet(allEvents, limit, page);
  if (normalizedResult.duplicateCount > 0) {
    console.warn(
      `[DONKI] Removed ${normalizedResult.duplicateCount} duplicate space weather event(s) by id`,
    );
  }

  const normalizedWarnings = finalizeWarnings(warnings);

  return {
    events: normalizedResult.events,
    count: normalizedResult.events.length,
    totalAvailable: normalizedResult.totalAvailable,
    limitApplied: limit,
    ...(typeof page === "number" ? { page } : {}),
    meta: {
      dateRange: { start: startDate, end: endDate },
      typesIncluded,
      warnings: normalizedWarnings,
      totalCapApplied: normalizedResult.totalCapApplied,
      totalCap: SPACE_WEATHER_MAX_TOTAL_RESULTS,
    },
  };
}

export function __resetDonkiTransientStateForTests(): void {
  SINGLE_FLIGHT.clear();
  STALE_EVENTS.clear();
  STALE_NOTIFICATIONS.clear();
  DONKI_BASE_COOLDOWNS.clear();
  hasWarnedMissingNasaApiKey = false;
}

export function parseEventType(eventId: string): SpaceWeatherEventType | null {
  if (eventId.includes("-FLR-")) return "FLR";
  if (eventId.includes("-CME-")) return "CME";
  if (eventId.includes("-GST-")) return "GST";
  if (eventId.includes("-IPS-")) return "IPS";
  if (eventId.includes("-HSS-")) return "HSS";
  if (eventId.includes("-SEP-")) return "SEP";
  return null;
}

export function parseEventDate(eventId: string): string | null {
  const match = eventId.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export async function fetchSpaceWeatherEventById(
  eventId: string,
): Promise<AnySpaceWeatherEvent | null> {
  const eventType = parseEventType(eventId);
  const eventDate = parseEventDate(eventId);

  if (!eventType || !eventDate) {
    console.warn(`[DONKI] Could not parse event ID: ${eventId}`);
    return null;
  }

  const startStr = addDaysUtc(eventDate, -1);
  const endStr = addDaysUtc(eventDate, 1);

  let fetchResult: DonkiTypeFetchResult | null = null;

  switch (eventType) {
    case "FLR":
      fetchResult = await fetchSolarFlaresRaw(startStr, endStr);
      break;
    case "CME":
      fetchResult = await fetchCMEsRaw(startStr, endStr);
      break;
    case "GST":
      fetchResult = await fetchGSTsRaw(startStr, endStr);
      break;
    case "IPS":
      fetchResult = await fetchIPSRaw(startStr, endStr);
      break;
    case "HSS":
      fetchResult = await fetchHSSRaw(startStr, endStr);
      break;
    case "SEP":
      fetchResult = await fetchSEPRaw(startStr, endStr);
      break;
  }

  if (!fetchResult) return null;

  if (fetchResult.failed) {
    throw new DonkiUpstreamUnavailableError(
      `DONKI request timed out or failed while fetching ${eventType} event details.`,
    );
  }

  return dedupeSpaceWeatherEvents(fetchResult.events).find((event) => event.id === eventId) || null;
}

export function getEventSeverity(event: AnySpaceWeatherEvent): SpaceWeatherSeverity {
  switch (event.eventType) {
    case "FLR":
      return getFlareClassSeverity(event.classType);
    case "CME":
      return getCMESeverity(event.speed);
    case "GST":
      return getKpSeverity(event.kpIndex);
    case "IPS":
    case "HSS":
    case "SEP":
      return "minor";
  }
}
