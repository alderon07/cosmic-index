import { NextRequest } from "next/server";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import {
  fetchSpaceWeatherEventById,
  getEventSeverity,
  getEventTypeLabel,
} from "@/lib/nasa-donki";
import { initRequest, withRateLimit } from "@/lib/api-middleware";
import { apiSuccess, apiError, handleRouteError } from "@/lib/api-response";
import { ErrorCode, ERROR_STATUS } from "@/lib/api-errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "DETAIL", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const { id } = await params;

  try {
    const eventId = decodeURIComponent(id);
    const event = await fetchSpaceWeatherEventById(eventId);

    if (!event) {
      return apiError(
        ErrorCode.NOT_FOUND,
        "Event not found.",
        ERROR_STATUS[ErrorCode.NOT_FOUND],
        requestId,
        undefined,
        rateLimit.headers,
      );
    }

    const severity = getEventSeverity(event);
    const typeLabel = getEventTypeLabel(event.eventType);

    return apiSuccess({
      event,
      severity,
      typeLabel,
      links: {
        donkiSearch: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/search/",
        noaaSwpc: "https://www.swpc.noaa.gov/",
      },
    }, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER_DETAIL),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
