import { afterEach, describe, expect, it } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { getObservatoryHealth } from "@/lib/observatory-health";

let db: Client | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

async function testDb() {
  db = createClient({ url: ":memory:" });
  await db.execute(`CREATE TABLE observatory_evaluator_state (
    domain TEXT PRIMARY KEY, last_success_at TEXT, last_error_at TEXT, last_error_code TEXT
  )`);
  return db;
}

describe("Observatory evaluator health", () => {
  it("reports starting until both evaluator domains have succeeded", async () => {
    const client = await testDb();
    expect(await getObservatoryHealth(new Date("2026-07-12T12:00:00.000Z"), client))
      .toEqual({ status: "starting", lastCheckedAt: null });
  });

  it("reports healthy only while both evaluator domains are fresh", async () => {
    const client = await testDb();
    await client.executeMultiple(`
      INSERT INTO observatory_evaluator_state (domain, last_success_at)
        VALUES ('space_weather', '2026-07-12T11:45:00.000Z');
      INSERT INTO observatory_evaluator_state (domain, last_success_at)
        VALUES ('close_approach', '2026-07-12T11:00:00.000Z');
    `);

    expect(await getObservatoryHealth(new Date("2026-07-12T12:00:00.000Z"), client))
      .toEqual({ status: "healthy", lastCheckedAt: "2026-07-12T11:45:00.000Z" });
    expect(await getObservatoryHealth(new Date("2026-07-12T15:00:00.000Z"), client))
      .toEqual({ status: "delayed", lastCheckedAt: "2026-07-12T11:45:00.000Z" });
  });

  it("reports a failure newer than the last success as delayed", async () => {
    const client = await testDb();
    await client.executeMultiple(`
      INSERT INTO observatory_evaluator_state (domain, last_success_at, last_error_at)
        VALUES ('space_weather', '2026-07-12T11:55:00.000Z', '2026-07-12T11:56:00.000Z');
      INSERT INTO observatory_evaluator_state (domain, last_success_at)
        VALUES ('close_approach', '2026-07-12T11:30:00.000Z');
    `);

    expect((await getObservatoryHealth(new Date("2026-07-12T12:00:00.000Z"), client)).status)
      .toBe("delayed");
  });
});
