// Offline analysis of the retained input. No network, database access, or writes.
// Run: bun scripts/analyze-fireball-completeness.ts
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { FIREBALL_RESEARCH_URL, summarizeFireballs } from "../src/lib/editorial/fireball-completeness";

const raw = await readFile(new URL("../public/research/fireballs-2025-retrieved-2026-10-14.json", import.meta.url));
console.log(JSON.stringify({
  retrievedOn: "2026-10-14",
  sourceUrl: FIREBALL_RESEARCH_URL,
  snapshotSha256: createHash("sha256").update(raw).digest("hex"),
  counts: summarizeFireballs(JSON.parse(raw.toString("utf8")) as unknown),
}, null, 2));
