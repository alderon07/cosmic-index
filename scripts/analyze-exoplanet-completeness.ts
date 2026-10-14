// Read-only editorial research. Prints a candidate snapshot for review; never publishes it.
// Run: bun scripts/analyze-exoplanet-completeness.ts
import { createHash } from "node:crypto";
import { COMPLETENESS_QUERY, COMPLETENESS_URL, summarizeCompleteness } from "../src/lib/editorial/exoplanet-completeness";

const response = await fetch(COMPLETENESS_URL, { signal: AbortSignal.timeout(45000) });
if (!response.ok) throw new Error(`NASA TAP returned ${response.status}`);
if (!response.body) throw new Error("NASA TAP returned no body");
const chunks: Uint8Array[] = [];
let bytes = 0;
const reader = response.body.getReader();
try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 5_000_000) {
      await reader.cancel();
      throw new Error("NASA TAP response exceeds 5 MB");
    }
    chunks.push(value);
  }
} finally {
  reader.releaseLock();
}
const raw = Buffer.concat(chunks);
const groups = summarizeCompleteness(JSON.parse(raw.toString("utf8")) as unknown);
console.log(JSON.stringify({
  retrievedAt: new Date().toISOString(),
  query: COMPLETENESS_QUERY,
  sourceUrl: COMPLETENESS_URL,
  responseSha256: createHash("sha256").update(raw).digest("hex"),
  total: groups.reduce((sum, group) => sum + group.total, 0),
  groups,
}, null, 2));
