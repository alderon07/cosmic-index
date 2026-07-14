import { z } from "zod";
import {
  InternalDestinationSchema,
  ObservatorySourceUrlSchema,
} from "@/lib/observatory-url";

const WeatherConfigSchema = z.object({
  schemaVersion: z.literal(1),
  categories: z.array(z.enum(["flr", "sep", "cme", "ips", "gst", "rbe", "mpc", "other"])).min(1).max(8),
  minimumSeverity: z.enum(["moderate", "strong", "severe"]),
}).strict();

const ApproachConfigSchema = z.object({
  schemaVersion: z.literal(1),
  maxDistanceLd: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10), z.literal(20)]),
  leadTimeDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  phaOnly: z.boolean(),
}).strict();

const WatchBaseShape = {
  id: z.number().int().positive(),
  name: z.string().min(1).max(80),
  configHash: z.string().optional(),
  enabled: z.boolean(),
  enabledAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastMatchedAt: z.string().nullable().optional(),
};

export const WatchSchema = z.discriminatedUnion("alertType", [
  z.object({ ...WatchBaseShape, alertType: z.literal("space_weather"), config: WeatherConfigSchema }).strict(),
  z.object({ ...WatchBaseShape, alertType: z.literal("close_approach"), config: ApproachConfigSchema }).strict(),
]);

export const WatchUsageSchema = z.object({
  current: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  remaining: z.number().int().nonnegative(),
}).strict();

export const WatchesResponseSchema = z.union([
  z.object({
    alerts: z.array(WatchSchema), usage: WatchUsageSchema, total: z.number().int().nonnegative(),
    hasMore: z.boolean(), nextCursor: z.string().nullable(),
  }).strict(),
  z.object({
    watches: z.array(WatchSchema), usage: WatchUsageSchema, total: z.number().int().nonnegative(),
    hasMore: z.boolean(), nextCursor: z.string().nullable(),
  }).strict(),
]).transform((value) => ({
  alerts: "alerts" in value ? value.alerts : value.watches,
  usage: value.usage,
  total: value.total,
  hasMore: value.hasMore,
  nextCursor: value.nextCursor,
}));

const RawSignalSchema = z.object({
  id: z.number().int().positive(),
  alertId: z.number().int().positive().nullable(),
  title: z.string(),
  summary: z.string(),
  matchReason: z.string(),
  severity: z.enum(["minor", "moderate", "strong", "severe", "extreme"]).nullable(),
  triggerKey: z.string(),
  source: z.enum(["donki", "swpc", "cneos"]),
  eventType: z.string(),
  destinationUrl: InternalDestinationSchema,
  sourceUrl: ObservatorySourceUrlSchema.nullable().optional().default(null),
  eventAt: z.string().nullable(),
  sourceAt: z.string().nullable(),
  snapshot: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
  readAt: z.string().nullable(),
  watchName: z.string(),
}).strict();

function sourceLabel(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized.includes("donki")) return "NASA DONKI";
  if (normalized.includes("swpc")) return "NOAA SWPC";
  if (normalized.includes("cneos")) return "NASA/JPL CNEOS";
  return "Source data";
}

export const SignalSchema = RawSignalSchema.transform((signal) => ({
  ...signal,
  severity: signal.severity ?? "notable" as const,
  sourceLabel: sourceLabel(signal.source),
}));

export const SignalsResponseSchema = z.object({
  signals: z.array(SignalSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
}).strict();

export const UnreadCountSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
}).strict();

export type ObservatoryWatch = z.infer<typeof WatchSchema>;
export type WatchUsage = z.infer<typeof WatchUsageSchema>;
export type ObservatorySignal = z.infer<typeof SignalSchema>;
export type WatchesResponse = z.output<typeof WatchesResponseSchema>;
export type SignalsResponse = z.output<typeof SignalsResponseSchema>;

export interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
}
