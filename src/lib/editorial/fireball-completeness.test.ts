import { describe, expect, it } from "bun:test";
import { summarizeFireballs } from "./fireball-completeness";
import snapshot from "../../../public/research/fireballs-2025-retrieved-2026-10-14.json";

const fields = ["date", "lat", "lat-dir", "lon", "lon-dir", "alt", "vx", "vy", "vz"];
const row = ["2025-01-01 00:00:00", "0", "N", "0", "E", "30", "0", "-10", "2"];
const payload = (data: (string | null)[][]) => ({ signature: { version: "1.2", source: "NASA/JPL Fireball Data API" }, count: String(data.length), fields, data });

describe("fireball completeness", () => {
  it("reproduces the published counts from retained input rows", () => {
    expect(summarizeFireballs(snapshot)).toEqual({ total: 33, location: 33, altitude: 33, velocity: 22, all: 22 });
  });
  it("counts zero coordinates and velocity components as reported", () => {
    expect(summarizeFireballs(payload([row]))).toEqual({ total: 1, location: 1, altitude: 1, velocity: 1, all: 1 });
  });
  it("requires complete location and velocity groups", () => {
    const incomplete = [...row];
    incomplete[0] = "2025-02-01 00:00:00";
    incomplete[4] = null;
    incomplete[8] = null;
    expect(summarizeFireballs(payload([row, incomplete]))).toEqual({ total: 2, location: 1, altitude: 2, velocity: 1, all: 1 });
  });
  it("handles an empty result", () => {
    expect(summarizeFireballs(payload([])).total).toBe(0);
  });
  it("rejects count mismatches, duplicate dates, changed versions and malformed rows", () => {
    expect(() => summarizeFireballs({ ...payload([row]), count: "2" })).toThrow();
    expect(() => summarizeFireballs(payload([row, row]))).toThrow();
    expect(() => summarizeFireballs({ ...payload([row]), signature: { version: "2.0", source: "NASA/JPL Fireball Data API" } })).toThrow();
    expect(() => summarizeFireballs(payload([row.slice(1)]))).toThrow();
    expect(() => summarizeFireballs({ ...payload([row]), fields: fields.map(() => "date") })).toThrow();
    expect(() => summarizeFireballs(payload([[...row.slice(0, 8), "NaN"]]))).toThrow();
  });
});
