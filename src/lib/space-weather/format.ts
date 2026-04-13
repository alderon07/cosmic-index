const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function formatSpaceWeatherTimestamp(
  value: string | null | undefined,
): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return timestampFormatter.format(date);
}

const relativeUnits: Array<[number, string]> = [
  [60, "second"],
  [3600, "minute"],
  [86400, "hour"],
  [604800, "day"],
];

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "Unknown";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 0) return "Just now";
  if (diffSeconds < 10) return "Just now";

  for (let i = 0; i < relativeUnits.length; i++) {
    const [threshold, unit] = relativeUnits[i];
    if (diffSeconds < threshold) {
      const prev = i === 0 ? 1 : relativeUnits[i - 1][0] as number;
      const value = Math.floor(diffSeconds / prev);
      return `${value} ${unit}${value !== 1 ? "s" : ""} ago`;
    }
  }

  const days = Math.floor(diffSeconds / 86400);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}
