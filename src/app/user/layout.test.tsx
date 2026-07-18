import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import UserLayout, { metadata } from "@/app/user/layout";

describe("UserLayout", () => {
  it("keeps every authenticated user route out of search indexes", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(renderToStaticMarkup(<UserLayout>Private</UserLayout>)).toBe("Private");
  });
});
