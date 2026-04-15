import { z } from "zod";

const SpaceWeatherEventSchema = z.object({
  id: z.string(),
  eventType: z.enum(["FLR", "CME", "GST", "IPS", "HSS", "SEP"]),
  startTime: z.string(),
}).passthrough();

const EventSummarySchema = z.object({
  total: z.number(),
  dominantType: z.enum(["FLR", "CME", "GST", "IPS", "HSS", "SEP"]).nullable(),
  windowDays: z.number(),
  warning: z.string().nullable().optional(),
});

const NotificationSummarySchema = z.object({
  total: z.number(),
  latestIssuedAt: z.string().nullable(),
  warning: z.string().nullable().optional(),
  sourcesIncluded: z.array(z.string()).optional(),
});

export const SpaceWeatherOverviewSnapshotSchema = z.object({
  generatedAt: z.string(),
  latestEvent: SpaceWeatherEventSchema.nullable(),
  eventSummary: EventSummarySchema,
  notificationSummary: NotificationSummarySchema,
});

export type SpaceWeatherOverviewSnapshotParsed = z.infer<
  typeof SpaceWeatherOverviewSnapshotSchema
>;

const AlertRelatedEventSchema = z.object({
  id: z.string(),
  eventType: z.enum(["FLR", "CME", "GST", "IPS", "HSS", "SEP"]),
  typeLabel: z.string(),
  severity: z.enum(["minor", "moderate", "strong", "severe", "extreme"]),
  startTime: z.string(),
});

const AlertSchema = z.object({
  id: z.string(),
  source: z.enum(["donki", "swpc"]),
  category: z.enum(["flr", "sep", "cme", "ips", "gst", "rbe", "mpc", "other"]),
  title: z.string(),
  summary: z.string(),
  severity: z.enum(["minor", "moderate", "strong", "severe", "extreme"]),
  issuedAt: z.string(),
  sourceUrl: z.string().optional(),
  activityCount: z.number(),
  relatedEventIds: z.array(z.string()),
  relatedEvents: z.array(AlertRelatedEventSchema),
});

export const AlertsPaginatedResultSchema = z.object({
  objects: z.array(AlertSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  limit: z.number(),
  hasMore: z.boolean(),
  mode: z.enum(["offset", "cursor", "none"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type AlertsPaginatedResultParsed = z.infer<
  typeof AlertsPaginatedResultSchema
>;
