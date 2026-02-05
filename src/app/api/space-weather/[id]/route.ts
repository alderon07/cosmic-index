import { NextRequest, NextResponse } from "next/server";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import {
  checkRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/rate-limit";
import {
  fetchSpaceWeatherEventById,
  getEventSeverity,
  getEventTypeLabel,
} from "@/lib/nasa-donki";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/space-weather/[id]
 *
 * Fetch a single space weather event by its DONKI ID.
 * ID format: "2024-01-15T06:30:00-FLR-001"
 *
 * Response includes:
 * - Full event data
 * - Computed severity
 * - Event type label
 * - Links to NASA DONKI source
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientId, "DETAIL");

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { id } = await params;

    // Decode the ID (it might be URL-encoded due to colons and other chars)
    const eventId = decodeURIComponent(id);

    // Fetch the event
    const event = await fetchSpaceWeatherEventById(eventId);

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Build response with additional computed fields
    const severity = getEventSeverity(event);
    const typeLabel = getEventTypeLabel(event.eventType);

    return NextResponse.json(
      {
        event,
        severity,
        typeLabel,
        links: {
          donkiSearch: getDonkiSearchUrl(),
          noaaSwpc: "https://www.swpc.noaa.gov/",
        },
      },
      {
        headers: {
          // Cache for 6 hours - events don't change after they're recorded
          "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER_DETAIL || 21600),
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching space weather event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * Get the NASA DONKI search URL
 * Note: DONKI doesn't support direct links to individual events
 */
function getDonkiSearchUrl(): string {
  return "https://kauai.ccmc.gsfc.nasa.gov/DONKI/search/";
}
