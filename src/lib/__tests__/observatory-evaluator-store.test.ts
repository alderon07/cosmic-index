import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { createObservatoryEvaluatorStore } from "@/lib/observatory-evaluator-store";
import type { ObservatorySignalDraft, ObservatoryWatchRecord } from "@/lib/observatory-evaluator";

let db: Client;

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await db.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id TEXT PRIMARY KEY, tier TEXT NOT NULL);
    CREATE TABLE alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      config TEXT NOT NULL,
      config_hash TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      enabled_at TEXT,
      last_matched_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE alert_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alert_id INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
      watch_name TEXT NOT NULL,
      trigger_key TEXT NOT NULL,
      source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      match_reason TEXT NOT NULL,
      event_at TEXT,
      source_at TEXT,
      destination_url TEXT NOT NULL,
      source_url TEXT,
      snapshot_json TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE observatory_trigger_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      config_hash TEXT NOT NULL,
      source TEXT NOT NULL,
      trigger_key TEXT NOT NULL,
      first_triggered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE(user_id, config_hash, source, trigger_key)
    );
    CREATE TABLE observatory_evaluator_state (
      domain TEXT PRIMARY KEY, watermark TEXT, run_id TEXT, run_start_watermark TEXT,
      lease_owner TEXT, lease_expires_at TEXT, last_success_at TEXT, last_error_at TEXT,
      last_error_code TEXT, last_cleanup_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    INSERT INTO users (id, tier) VALUES ('user_1', 'free');
    INSERT INTO alerts
      (id, user_id, name, alert_type, config, config_hash, enabled, enabled_at, updated_at)
    VALUES
      (1, 'user_1', 'Storms', 'space_weather',
       '{"schemaVersion":1,"categories":["gst"],"minimumSeverity":"strong"}',
       'same-config', 1, '2026-07-12T00:00:00.000Z', '2026-07-12T00:00:00.000Z');
  `);
});

afterEach(() => db.close());

const watch: ObservatoryWatchRecord = {
  id: 1,
  userId: "user_1",
  name: "Storms",
  alertType: "space_weather",
  configHash: "same-config",
  config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" },
  enabledAt: "2026-07-12T00:00:00.000Z",
  lastMatchedAt: null,
};

const signal: ObservatorySignalDraft = {
  triggerKey: "space-weather:donki:AL-1",
  source: "donki",
  eventType: "gst",
  severity: "strong",
  title: "Strong storm",
  summary: "A storm was reported.",
  matchReason: "The storm matched.",
  eventAt: "2026-07-12T12:00:00.000Z",
  sourceAt: "2026-07-12T12:00:00.000Z",
  destinationUrl: "/space-weather/alerts",
  snapshot: { id: "AL-1" },
};

describe("createObservatoryEvaluatorStore", () => {
  it("retains a lease across continuation batches and excludes another owner", async () => {
    const store = createObservatoryEvaluatorStore(db);
    expect(await store.acquireLease({ domain: "space_weather", owner: "owner-a", ttlSeconds: 60, continuation: false }))
      .toMatchObject({ acquired: true });
    expect(await store.acquireLease({ domain: "space_weather", owner: "owner-b", ttlSeconds: 60, continuation: false }))
      .toMatchObject({ acquired: false });
    expect(await store.acquireLease({ domain: "space_weather", owner: "owner-a", ttlSeconds: 60, continuation: true }))
      .toMatchObject({ acquired: true });

    await store.completeLease({
      domain: "space_weather",
      owner: "owner-a",
      watermark: "2026-07-12T12:00:00.000Z",
    });
    expect(await store.acquireLease({ domain: "space_weather", owner: "owner-a", ttlSeconds: 60, continuation: true }))
      .toMatchObject({ acquired: false });
    expect(await store.acquireLease({ domain: "space_weather", owner: "owner-b", ttlSeconds: 60, continuation: false }))
      .toMatchObject({ acquired: true, watermark: "2026-07-12T12:00:00.000Z" });
  });

  it("writes a Signal once and updates mutable source details", async () => {
    const store = createObservatoryEvaluatorStore(db);
    expect(await store.recordSignalDurably({ watch, signal })).toBe("inserted");
    expect(await store.recordSignalDurably({ watch, signal })).toBe("duplicate");
    expect(await store.recordSignalDurably({
      watch,
      signal: { ...signal, summary: "The corrected storm report." },
    })).toBe("updated");

    const rows = await db.execute("SELECT summary FROM alert_signals");
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.summary).toBe("The corrected storm report.");
  });

  it("uses the user/config ledger to suppress delete-and-recreate spam", async () => {
    const store = createObservatoryEvaluatorStore(db);
    expect(await store.recordSignalDurably({ watch, signal })).toBe("inserted");
    await db.execute("DELETE FROM alerts WHERE id = 1");
    await db.execute({
      sql: `INSERT INTO alerts
              (id, user_id, name, alert_type, config, config_hash, enabled, enabled_at)
            VALUES (2, 'user_1', 'Storms again', 'space_weather', ?, 'same-config', 1, ?)`,
      args: [JSON.stringify(watch.config), watch.enabledAt],
    });

    expect(await store.recordSignalDurably({
      watch: { ...watch, id: 2, name: "Storms again" },
      signal,
    })).toBe("duplicate");
    const rows = await db.execute("SELECT id FROM alert_signals");
    expect(rows.rows).toHaveLength(1);
  });

  it("defensively evaluates only the newest enabled watch for a Free user", async () => {
    await db.execute({
      sql: `INSERT INTO alerts
              (id, user_id, name, alert_type, config, config_hash, enabled, enabled_at, updated_at)
            VALUES (2, 'user_1', 'Newer storms', 'space_weather', ?, 'new-config', 1, ?, ?)`,
      args: [JSON.stringify(watch.config), watch.enabledAt, "2026-07-12 01:00:00"],
    });
    const page = await createObservatoryEvaluatorStore(db).listEnabledWatchesPage({
      domain: "space_weather",
      afterId: null,
      limit: 100,
    });

    expect(page.watches.map((candidate) => candidate.id)).toEqual([2]);
  });

  it("continues cleanup while either Signals or ledger entries remain and records completion", async () => {
    await db.executeMultiple(`
      INSERT INTO alert_signals
        (user_id, alert_id, watch_name, trigger_key, source, event_type, title, summary,
         match_reason, destination_url, created_at)
      VALUES
        ('user_1', 1, 'Storms', 's1', 'donki', 'gst', 'One', 'One', 'One', '/', '2024-01-01T00:00:00.000Z'),
        ('user_1', 1, 'Storms', 's2', 'donki', 'gst', 'Two', 'Two', 'Two', '/', '2024-01-01T00:00:00.000Z'),
        ('user_1', 1, 'Storms', 's3', 'donki', 'gst', 'Three', 'Three', 'Three', '/', '2024-01-01T00:00:00.000Z');
      INSERT INTO observatory_trigger_ledger
        (user_id, config_hash, source, trigger_key, last_seen_at)
      VALUES
        ('user_1', 'same-config', 'donki', 'l1', '2024-01-01T00:00:00.000Z'),
        ('user_1', 'same-config', 'donki', 'l2', '2024-01-01T00:00:00.000Z'),
        ('user_1', 'same-config', 'donki', 'l3', '2024-01-01T00:00:00.000Z');
    `);
    const store = createObservatoryEvaluatorStore(db);

    expect(await store.cleanupSignals({ limit: 2 })).toEqual({ deleted: 4, hasMore: true });
    expect(await store.cleanupSignals({ limit: 2 })).toEqual({ deleted: 2, hasMore: false });
    const state = await db.execute("SELECT last_cleanup_at FROM observatory_evaluator_state WHERE domain = 'cleanup'");
    expect(state.rows[0]?.last_cleanup_at).toBeString();
  });
});
