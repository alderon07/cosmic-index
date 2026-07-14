import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildWatchPayload,
  createInitialWatchBuilderState,
  watchBuilderReducer,
  WatchBuilderForm,
} from "@/components/observatory/watch-builder";

describe("watch builder", () => {
  it("builds a simple space-weather sentence and API payload", () => {
    let state = createInitialWatchBuilderState();
    state = watchBuilderReducer(state, { type: "choose-domain", domain: "space_weather" });
    state = watchBuilderReducer(state, { type: "set-weather-category", category: "gst" });
    state = watchBuilderReducer(state, { type: "set-severity", severity: "severe" });

    expect(buildWatchPayload(state)).toEqual({
      name: "Severe geomagnetic storms",
      alertType: "space_weather",
      config: {
        schemaVersion: 1,
        categories: ["gst"],
        minimumSeverity: "severe",
      },
    });
  });

  it("builds the default close-approach payload", () => {
    let state = createInitialWatchBuilderState();
    state = watchBuilderReducer(state, { type: "choose-domain", domain: "close_approach" });

    expect(buildWatchPayload(state)).toEqual({
      name: "Close passes within 5 Moon distances",
      alertType: "close_approach",
      config: {
        schemaVersion: 1,
        maxDistanceLd: 5,
        leadTimeDays: 7,
        phaOnly: false,
      },
    });
  });

  it("renders semantic, child-friendly domain choices", () => {
    const html = renderToStaticMarkup(
      <WatchBuilderForm
        state={createInitialWatchBuilderState()}
        dispatch={() => undefined}
        onSubmit={() => undefined}
        isSubmitting={false}
      />,
    );

    expect(html).toContain("What should we watch?");
    expect(html).toContain("Space weather");
    expect(html).toContain("Close approaches");
    expect(html).toContain("Storms and activity from the Sun");
    expect(html).toContain('type="button"');
  });
});
