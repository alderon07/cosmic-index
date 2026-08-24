import { describe, expect, it } from "bun:test";
import openApi from "@/lib/openapi/openapi.json";

describe("AdSense eligibility OpenAPI contract", () => {
  it("documents authentication and all endpoint responses", () => {
    const operation = openApi.paths["/user/ad-eligibility"].get;

    expect(operation.security).toEqual([{ ClerkSession: [] }]);
    expect(operation.responses["200"]).toBeDefined();
    expect(operation.responses["401"]).toBeDefined();
    expect(operation.responses["503"]).toBeDefined();
    expect(openApi.components.securitySchemes.ClerkSession).toBeDefined();
  });
});
