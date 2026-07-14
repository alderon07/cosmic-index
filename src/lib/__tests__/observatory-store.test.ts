import { afterEach, describe, expect, it } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { createWatch, getWatch, reconcileWatchAllowance, setSignalReadState, updateWatch } from "@/lib/observatory-store";

let db: Client | null = null;

async function createTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  await client.executeMultiple(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, tier TEXT NOT NULL DEFAULT 'free');
    CREATE TABLE alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT,
      alert_type TEXT NOT NULL,
      config TEXT NOT NULL,
      config_hash TEXT,
      enabled BOOLEAN NOT NULL DEFAULT 1,
      email_enabled BOOLEAN NOT NULL DEFAULT 0,
      enabled_at TEXT,
      last_matched_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE UNIQUE INDEX idx_alerts_user_type_config
      ON alerts(user_id, alert_type, config_hash) WHERE config_hash IS NOT NULL;
    CREATE TABLE alert_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      read_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE observatory_trigger_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      config_hash TEXT NOT NULL,
      source TEXT NOT NULL,
      trigger_key TEXT NOT NULL,
      first_triggered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE(user_id, config_hash, source, trigger_key)
    );
    INSERT INTO users (id, email) VALUES ('free-user', 'free@example.com');
    INSERT INTO users (id, email) VALUES ('other-user', 'other@example.com');
    INSERT INTO alert_signals (user_id) VALUES ('free-user');
  `);
  return client;
}

afterEach(() => {
  db?.close();
  db = null;
});

describe("Observatory Watch persistence", () => {
  it("atomically admits only one Watch for a Free user", async () => {
    db = await createTestDb();
    const results = await Promise.all([
      createWatch({
        userId: "free-user", tier: "free", db,
        watch: { name: "Storms", alertType: "space_weather", config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" } },
      }),
      createWatch({
        userId: "free-user", tier: "free", db,
        watch: { name: "Near Earth", alertType: "close_approach", config: { schemaVersion: 1, maxDistanceLd: 5, leadTimeDays: 7, phaOnly: false } },
      }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["created", "limit"]);
  });

  it("counts a paused Watch against the allowance", async () => {
    db = await createTestDb();
    const created = await createWatch({
      userId: "free-user", tier: "free", db,
      watch: { name: "Storms", alertType: "space_weather", config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" } },
    });
    if (created.status !== "created") throw new Error("Expected Watch creation");
    const paused = await updateWatch({
      userId: "free-user", tier: "free", id: created.watch.id, db,
      update: { enabled: false, expectedUpdatedAt: created.watch.updatedAt },
    });
    expect(paused.status).toBe("updated");

    const second = await createWatch({
      userId: "free-user", tier: "free", db,
      watch: { name: "Near Earth", alertType: "close_approach", config: { schemaVersion: 1, maxDistanceLd: 5, leadTimeDays: 7, phaOnly: false } },
    });
    expect(second.status).toBe("limit");
  });

  it("rejects duplicate canonical configs and stale edits", async () => {
    db = await createTestDb();
    const watch = { name: "Storms", alertType: "space_weather" as const, config: { schemaVersion: 1 as const, categories: ["gst" as const], minimumSeverity: "strong" as const } };
    const first = await createWatch({ userId: "free-user", tier: "pro", db, watch });
    expect(first.status).toBe("created");
    expect((await createWatch({ userId: "free-user", tier: "pro", db, watch })).status).toBe("duplicate");
    if (first.status !== "created") throw new Error("Expected Watch creation");
    expect((await updateWatch({
      userId: "free-user", tier: "pro", id: first.watch.id, db,
      update: { name: "Changed", expectedUpdatedAt: "stale-timestamp" },
    })).status).toBe("conflict");
  });

  it("keeps only the most recently updated Watch enabled after downgrade", async () => {
    db = await createTestDb();
    const older = await createWatch({
      userId: "free-user", tier: "pro", db,
      watch: { name: "Storms", alertType: "space_weather", config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" } },
    });
    const newer = await createWatch({
      userId: "free-user", tier: "pro", db,
      watch: { name: "Near Earth", alertType: "close_approach", config: { schemaVersion: 1, maxDistanceLd: 5, leadTimeDays: 7, phaOnly: false } },
    });
    if (older.status !== "created" || newer.status !== "created") throw new Error("Expected Watch creation");
    await db.execute({ sql: "UPDATE alerts SET updated_at = '2026-02-01T00:30:00.000Z' WHERE id = ?", args: [older.watch.id] });
    await db.execute({ sql: "UPDATE alerts SET updated_at = '2026-02-01 01:00:00' WHERE id = ?", args: [newer.watch.id] });

    expect(await reconcileWatchAllowance("free-user", "free", db)).toBe(1);
    expect((await getWatch("free-user", older.watch.id, db))?.enabled).toBe(false);
    expect((await getWatch("free-user", newer.watch.id, db))?.enabled).toBe(true);
    expect((await updateWatch({
      userId: "free-user", tier: "free", id: older.watch.id, db,
      update: { enabled: true, expectedUpdatedAt: "2026-02-01T00:30:00.000Z" },
    })).status).toBe("limit");
    expect(await reconcileWatchAllowance("free-user", "pro", db)).toBe(0);
  });

  it("preserves the newest currently-enabled Watch and never resumes a paused Watch", async () => {
    db = await createTestDb();
    const older = await createWatch({
      userId: "free-user", tier: "pro", db,
      watch: { name: "Storms", alertType: "space_weather", config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" } },
    });
    const newer = await createWatch({
      userId: "free-user", tier: "pro", db,
      watch: { name: "Near Earth", alertType: "close_approach", config: { schemaVersion: 1, maxDistanceLd: 5, leadTimeDays: 7, phaOnly: false } },
    });
    if (older.status !== "created" || newer.status !== "created") throw new Error("Expected Watch creation");
    await db.execute({ sql: "UPDATE alerts SET enabled = 0, updated_at = '2026-03-01 00:00:00' WHERE id = ?", args: [newer.watch.id] });
    await db.execute({ sql: "UPDATE alerts SET updated_at = '2026-02-01T00:00:00.000Z' WHERE id = ?", args: [older.watch.id] });

    expect(await reconcileWatchAllowance("free-user", "free", db)).toBe(0);
    expect((await getWatch("free-user", older.watch.id, db))?.enabled).toBe(true);
    expect((await getWatch("free-user", newer.watch.id, db))?.enabled).toBe(false);

    await db.execute("UPDATE alerts SET enabled = 0");
    expect(await reconcileWatchAllowance("free-user", "free", db)).toBe(0);
    expect((await getWatch("free-user", older.watch.id, db))?.enabled).toBe(false);
    expect((await getWatch("free-user", newer.watch.id, db))?.enabled).toBe(false);
  });

  it("starts an edited config at a fresh effective time and carries its trigger history forward", async () => {
    db = await createTestDb();
    const created = await createWatch({
      userId: "free-user", tier: "pro", db,
      watch: { name: "Storms", alertType: "space_weather", config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" } },
    });
    if (created.status !== "created") throw new Error("Expected Watch creation");
    await db.execute({
      sql: `UPDATE alerts SET enabled_at = '2026-01-01T00:00:00.000Z',
              last_matched_at = '2026-01-02T00:00:00.000Z' WHERE id = ?`,
      args: [created.watch.id],
    });
    await db.execute({
      sql: `INSERT INTO observatory_trigger_ledger
              (user_id, config_hash, source, trigger_key) VALUES (?, ?, 'donki', 'old-event')`,
      args: ["free-user", created.watch.configHash],
    });

    const updated = await updateWatch({
      userId: "free-user", tier: "pro", id: created.watch.id, db,
      update: {
        config: { schemaVersion: 1, categories: ["gst", "flr"], minimumSeverity: "strong" },
        expectedUpdatedAt: created.watch.updatedAt,
      },
    });
    expect(updated.status).toBe("updated");
    if (updated.status !== "updated") return;
    expect(updated.watch.enabledAt).not.toBe("2026-01-01T00:00:00.000Z");
    expect(updated.watch.lastMatchedAt).toBeNull();
    expect(updated.watch.configHash).not.toBe(created.watch.configHash);
    const carried = await db.execute({
      sql: `SELECT 1 FROM observatory_trigger_ledger
            WHERE user_id = ? AND config_hash = ? AND trigger_key = 'old-event'`,
      args: ["free-user", updated.watch.configHash],
    });
    expect(carried.rows).toHaveLength(1);
  });

  it("does not expose or mutate another user's records", async () => {
    db = await createTestDb();
    const created = await createWatch({
      userId: "free-user", tier: "free", db,
      watch: { name: "Storms", alertType: "space_weather", config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" } },
    });
    if (created.status !== "created") throw new Error("Expected Watch creation");
    expect(await getWatch("other-user", created.watch.id, db)).toBeNull();
    expect(await setSignalReadState("other-user", 1, true, db)).toBe(false);
  });
});
