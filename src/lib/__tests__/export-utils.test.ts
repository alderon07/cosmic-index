import {
  computeFilterHash,
  decodeExportCursor,
  encodeExportCursor,
  generateExportFilename,
  type ExportCursor,
} from "@/lib/export-utils";

describe("export utils", () => {
  it("computes filter hash consistently regardless of key order", () => {
    const hashA = computeFilterHash({ query: "Kepler", sort: "name" });
    const hashB = computeFilterHash({ sort: "name", query: "Kepler" });
    expect(hashA).toBe(hashB);
  });

  it("ignores undefined and null filters", () => {
    const hashA = computeFilterHash({ query: "Kepler", maxDistancePc: undefined });
    const hashB = computeFilterHash({ query: "Kepler" });
    expect(hashA).toBe(hashB);
  });

  it("encodes and decodes cursors", () => {
    const cursor: ExportCursor = {
      category: "exoplanets",
      lastId: "cursor-123",
      filterHash: "abcd1234",
      expiresAt: Date.now() + 1000,
    };

    const encoded = encodeExportCursor(cursor);
    const decoded = decodeExportCursor(encoded);
    expect(decoded).toEqual(cursor);
  });

  it("returns null for invalid cursor", () => {
    expect(decodeExportCursor("not-base64")).toBeNull();
  });

  it("generates filenames with date stamp", () => {
    const filename = generateExportFilename("exoplanets", "ndjson");
    expect(filename).toMatch(/^exoplanets_\d{8}\.ndjson$/);
  });
});
