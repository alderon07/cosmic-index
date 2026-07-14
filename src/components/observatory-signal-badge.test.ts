import { describe, expect, it } from "bun:test";
import { formatUnreadCount } from "@/components/observatory-signal-badge";

describe("formatUnreadCount", () => {
  it("keeps small counts readable and caps large badges", () => {
    expect(formatUnreadCount(3)).toBe("3");
    expect(formatUnreadCount(99)).toBe("99");
    expect(formatUnreadCount(100)).toBe("99+");
  });
});
