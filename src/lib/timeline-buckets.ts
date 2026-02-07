export interface TimelineBucket {
  startIso: string;
  endIso: string;
  count: number;
  label: string;
}

interface TimelineEventInput {
  timestamp: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function bucketDaysForWindow(windowDays: number): number {
  if (windowDays <= 30) return 1;
  if (windowDays <= 90) return 3;
  return 7;
}

function utcStartOfDay(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function formatBucketLabel(start: Date, end: Date): string {
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (start.getTime() === end.getTime()) {
    return startLabel;
  }

  const endLabel = end.toLocaleDateString("en-US", {
    month: sameMonth && sameYear ? undefined : "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel}-${endLabel}`;
}

export function buildTimelineBuckets(params: {
  events: TimelineEventInput[];
  startDate: Date;
  endDate: Date;
}): TimelineBucket[] {
  const { events, startDate, endDate } = params;

  if (endDate.getTime() < startDate.getTime()) {
    return [];
  }

  const normalizedStart = utcStartOfDay(startDate);
  const normalizedEnd = utcStartOfDay(endDate);
  const windowDays = Math.max(
    1,
    Math.ceil((normalizedEnd.getTime() - normalizedStart.getTime()) / DAY_MS) + 1
  );
  const bucketDays = bucketDaysForWindow(windowDays);
  const bucketSizeMs = bucketDays * DAY_MS;

  const bucketMap = new Map<number, number>();
  for (const event of events) {
    const parsed = new Date(event.timestamp);
    if (Number.isNaN(parsed.getTime())) continue;
    const eventDay = utcStartOfDay(parsed).getTime();
    if (eventDay < normalizedStart.getTime() || eventDay > normalizedEnd.getTime()) continue;

    const bucketIndex = Math.floor(
      (eventDay - normalizedStart.getTime()) / bucketSizeMs
    );
    bucketMap.set(bucketIndex, (bucketMap.get(bucketIndex) ?? 0) + 1);
  }

  const bucketCount = Math.max(
    1,
    Math.ceil(
      (normalizedEnd.getTime() - normalizedStart.getTime() + DAY_MS) / bucketSizeMs
    )
  );
  const buckets: TimelineBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStartMs = normalizedStart.getTime() + i * bucketSizeMs;
    const bucketEndMs = Math.min(
      bucketStartMs + bucketSizeMs - DAY_MS,
      normalizedEnd.getTime()
    );
    const bucketStart = new Date(bucketStartMs);
    const bucketEnd = new Date(bucketEndMs);

    buckets.push({
      startIso: bucketStart.toISOString(),
      endIso: bucketEnd.toISOString(),
      count: bucketMap.get(i) ?? 0,
      label: formatBucketLabel(bucketStart, bucketEnd),
    });
  }

  if (buckets.length > 60) {
    const grouped: TimelineBucket[] = [];
    const groupSize = Math.ceil(buckets.length / 60);
    for (let i = 0; i < buckets.length; i += groupSize) {
      const group = buckets.slice(i, i + groupSize);
      grouped.push({
        startIso: group[0].startIso,
        endIso: group[group.length - 1].endIso,
        count: group.reduce((sum, item) => sum + item.count, 0),
        label: `${group[0].label} - ${group[group.length - 1].label}`,
      });
    }
    return grouped;
  }

  return buckets;
}

export function parseCloseApproachTimestamp(raw: string): string | null {
  // Expected input like "2025-Jan-01 05:24"
  const match = raw.match(/^(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }
  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = monthMap[match[2]];
  if (!month) return null;
  return `${match[1]}-${month}-${match[3]}T${match[4]}:${match[5]}:00.000Z`;
}
