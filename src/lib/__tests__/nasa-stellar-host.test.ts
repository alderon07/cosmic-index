import { describe, expect, it } from "bun:test";
import {
  buildStellarHostBatchQuery,
  buildStellarHostQuery,
  MAX_STELLAR_HOST_BATCH_SIZE,
} from "@/lib/nasa-stellar-host";

describe("buildStellarHostQuery", () => {
  it("uses an exact escaped hostname and an explicit detail-only column set", () => {
    const query = buildStellarHostQuery("O'Brien");

    expect(query).toContain("from stellarhosts");
    expect(query).toContain("lower(hostname)=lower('O''Brien')");
    expect(query).toContain("st_tefferr1");
    expect(query).toContain("sy_pmraerr2");
    expect(query).toContain("sy_gaiamag");
    expect(query).not.toContain("select *");
  });
});

describe("buildStellarHostBatchQuery", () => {
  it("retrieves multiple escaped hosts in one bounded TAP query", () => {
    const query = buildStellarHostBatchQuery(["11 UMi", "O'Brien"]);

    expect(query).toContain("from stellarhosts");
    expect(query).toContain("lower(hostname) in ('11 umi','o''brien')");
    expect(query).toContain("order by hostname asc, st_refname asc");
    expect(query).not.toContain("select *");
  });

  it("rejects empty and oversized batches before contacting the archive", () => {
    expect(() => buildStellarHostBatchQuery([])).toThrow();
    expect(() =>
      buildStellarHostBatchQuery(
        Array.from({ length: MAX_STELLAR_HOST_BATCH_SIZE + 1 }, (_, index) => `Star ${index}`),
      ),
    ).toThrow();
  });
});
