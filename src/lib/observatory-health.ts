import type { Client } from "@libsql/client";
import { requireUserDb } from "@/lib/user-db";

export type ObservatoryHealth = {
  status: "healthy" | "delayed" | "starting";
  lastCheckedAt: string | null;
};

const MAX_AGE_MS = {
  space_weather: 45 * 60_000,
  close_approach: 3 * 60 * 60_000,
} as const;

export async function getObservatoryHealth(
  now = new Date(),
  db: Client = requireUserDb(),
): Promise<ObservatoryHealth> {
  const result = await db.execute(`SELECT domain, last_success_at, last_error_at
    FROM observatory_evaluator_state
    WHERE domain IN ('space_weather', 'close_approach')`);
  const rows = new Map(result.rows.map((row) => [String(row.domain), row]));
  const successes: string[] = [];

  for (const domain of Object.keys(MAX_AGE_MS) as Array<keyof typeof MAX_AGE_MS>) {
    const row = rows.get(domain);
    if (!row?.last_success_at) return { status: "starting", lastCheckedAt: null };
    successes.push(String(row.last_success_at));
  }

  const lastCheckedAt = successes.reduce((latest, value) => value > latest ? value : latest);
  const delayed = (Object.keys(MAX_AGE_MS) as Array<keyof typeof MAX_AGE_MS>).some((domain) => {
    const row = rows.get(domain);
    const successAt = String(row?.last_success_at);
    const successTime = Date.parse(successAt);
    const errorAt = row?.last_error_at ? String(row.last_error_at) : null;
    return !Number.isFinite(successTime)
      || now.getTime() - successTime > MAX_AGE_MS[domain]
      || (errorAt !== null && errorAt > successAt);
  });

  return { status: delayed ? "delayed" : "healthy", lastCheckedAt };
}
