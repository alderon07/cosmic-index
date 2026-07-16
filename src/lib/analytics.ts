const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

export function parseGoogleAnalyticsId(value: string | undefined): string | null {
  const measurementId = value?.trim();

  if (!measurementId || !GA4_MEASUREMENT_ID_PATTERN.test(measurementId)) {
    return null;
  }

  return measurementId;
}
