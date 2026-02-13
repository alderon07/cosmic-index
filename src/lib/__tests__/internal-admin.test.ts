import { afterEach, describe, expect, it } from "bun:test";
import {
  getInternalAdminIds,
  getProRolloutAdminIds,
} from "@/lib/runtime-mode";
import {
  getInternalAdminSet,
  getProRolloutAdminSet,
  isInternalAdmin,
  isInternalAdminConfigured,
  isProRolloutAdmin,
  isProRolloutAdminConfigured,
} from "@/lib/admin-access";

const ORIGINAL_INTERNAL_ADMIN_IDS = process.env.INTERNAL_ADMIN_IDS;
const ORIGINAL_PRO_ROLLOUT_ADMIN_IDS = process.env.PRO_ROLLOUT_ADMIN_IDS;

afterEach(() => {
  process.env.INTERNAL_ADMIN_IDS = ORIGINAL_INTERNAL_ADMIN_IDS;
  process.env.PRO_ROLLOUT_ADMIN_IDS = ORIGINAL_PRO_ROLLOUT_ADMIN_IDS;
});

describe("internal admin id resolution", () => {
  it("uses INTERNAL_ADMIN_IDS when configured", () => {
    process.env.INTERNAL_ADMIN_IDS = "user_1, user_2";
    process.env.PRO_ROLLOUT_ADMIN_IDS = "legacy_1";

    expect(getInternalAdminIds()).toEqual(["user_1", "user_2"]);
    expect(getProRolloutAdminIds()).toEqual(["user_1", "user_2"]);
  });

  it("falls back to PRO_ROLLOUT_ADMIN_IDS when INTERNAL_ADMIN_IDS is whitespace", () => {
    process.env.INTERNAL_ADMIN_IDS = "   ";
    process.env.PRO_ROLLOUT_ADMIN_IDS = "legacy_1,legacy_2";

    expect(getInternalAdminIds()).toEqual(["legacy_1", "legacy_2"]);
  });
});

describe("admin access helpers", () => {
  it("returns configured set and membership checks", () => {
    process.env.INTERNAL_ADMIN_IDS = "user_admin";
    process.env.PRO_ROLLOUT_ADMIN_IDS = "";

    expect(isInternalAdminConfigured()).toBe(true);
    expect(isInternalAdmin("user_admin")).toBe(true);
    expect(isInternalAdmin("user_other")).toBe(false);
    expect(getInternalAdminSet()).toEqual(new Set(["user_admin"]));
  });

  it("keeps backward-compatible pro rollout wrappers", () => {
    process.env.INTERNAL_ADMIN_IDS = "user_admin";
    process.env.PRO_ROLLOUT_ADMIN_IDS = "";

    expect(isProRolloutAdminConfigured()).toBe(isInternalAdminConfigured());
    expect(isProRolloutAdmin("user_admin")).toBe(isInternalAdmin("user_admin"));
    expect(getProRolloutAdminSet()).toEqual(getInternalAdminSet());
  });
});
