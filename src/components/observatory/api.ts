import type { z } from "zod";
import {
  SignalsResponseSchema,
  UnreadCountSchema,
  WatchesResponseSchema,
  type ApiErrorBody,
} from "@/components/observatory/types";

export class ObservatoryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ObservatoryApiError";
  }
}

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as ApiErrorBody | null;
    throw new ObservatoryApiError(
      error?.message ?? error?.error ?? "The Observatory could not finish that request.",
      response.status,
      error?.code,
    );
  }
  return schema.parse(body);
}

export async function fetchWatches(cursor?: string) {
  const query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  return parseResponse(await fetch(`/api/user/alerts?${query}`, { cache: "no-store" }), WatchesResponseSchema);
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await parseResponse(
    await fetch("/api/user/signals/unread-count", { cache: "no-store" }),
    UnreadCountSchema,
  );
  return response.unreadCount;
}

export async function fetchSignals(status: "all" | "unread" | "read" = "all", cursor?: string) {
  const query = new URLSearchParams({ status, limit: "20" });
  if (cursor) query.set("cursor", cursor);
  return parseResponse(
    await fetch(`/api/user/signals?${query}`, { cache: "no-store" }),
    SignalsResponseSchema,
  );
}

export async function mutateJson(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ObservatoryApiError(
      error?.message ?? error?.error ?? "The Observatory could not finish that request.",
      response.status,
      error?.code,
    );
  }
  return response.json().catch(() => null);
}
