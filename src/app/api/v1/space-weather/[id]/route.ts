import { NextRequest } from "next/server";
import { z } from "zod";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import {
  fetchSpaceWeatherEventById,
  getEventSeverity,
  getEventTypeLabel,
} from "@/lib/nasa-donki";
import { initRequest, withRateLimit } from "@/lib/api-middleware";
import { apiSuccess, apiError, handleRouteError } from "@/lib/api-response";
import { ErrorCode, ERROR_STATUS } from "@/lib/api-errors";

const EventPathParamsSchema = z.object({
  id: z.string().min(1).max(256).transform((value, context) => {
    try {
      return decodeURIComponent(value);
    } catch {
      context.addIssue({ code: "custom", message: "Event ID must be valid URI encoding." });
      return z.NEVER;
    }
  }).pipe(z.string().min(1).max(256).regex(/^[^/\\\u0000-\u001f\u007f]+$/)),
}).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "UPSTREAM_DETAIL", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const pathParams = EventPathParamsSchema.safeParse(await params);
  if (!pathParams.success) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      "Invalid event ID.",
      ERROR_STATUS[ErrorCode.VALIDATION_ERROR],
      requestId,
      undefined,
      rateLimit.headers,
    );
  }

  try {
    const eventId = pathParams.data.id;
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
        donkiSearch: "https://ccmc.gsfc.nasa.gov/DONKI/search/",
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
