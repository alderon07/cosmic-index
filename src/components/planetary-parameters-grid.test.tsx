import { renderToStaticMarkup } from "react-dom/server";
import { PlanetaryParametersGrid } from "./planetary-parameters-grid";

describe("PlanetaryParametersGrid", () => {
  it("shows every parameter from the DMPP-2 d Archive panel", () => {
    const html = renderToStaticMarkup(
      <PlanetaryParametersGrid
        parameters={{
          reference: "Standing et al. 2026",
          orbitalPeriodDays: { value: 16.491, errorPlus: 0.067, errorMinus: 0.053 },
          semiMajorAxisAu: { value: 0.1432, errorPlus: 0.0012, errorMinus: 0.0013 },
          massEarth: { value: 91.79, errorPlus: 6.11, errorMinus: 7.32 },
          massJupiter: {
            value: 0.28880364,
            errorPlus: 0.01922421,
            errorMinus: 0.0230313,
          },
          massProvenance: "Msini",
          eccentricity: { value: 0.1, limit: "upper" },
          periastronEpoch: { value: 2457516.66, errorPlus: 3.69, errorMinus: 4.02 },
          timeSystem: "BJD",
          argumentOfPeriastronDeg: { value: 267, errorPlus: 57.9, errorMinus: 207 },
          radialVelocitySemiAmplitudeMps: {
            value: 18.21,
            errorPlus: 1.32,
            errorMinus: 1.38,
          },
        }}
      />
    );

    expect(html).toContain("Standing et al. 2026");
    expect(html).toContain("Orbital Period");
    expect(html).toContain("16.491");
    expect(html).toContain("Semi-Major Axis");
    expect(html).toContain("0.1432");
    expect(html).toContain("M sin(i) (Earth masses)");
    expect(html).toContain("91.79");
    expect(html).toContain("M sin(i) (Jupiter masses)");
    expect(html).toContain("0.2888");
    expect(html).toContain("&lt;0.1");
    expect(html).toContain("Epoch of Periastron");
    expect(html).toContain("2457516.66");
    expect(html).toContain("BJD");
    expect(html).toContain("Argument of Periastron");
    expect(html).toContain("267.0");
    expect(html).toContain("Radial Velocity Semi-Amplitude");
    expect(html).toContain("18.21");
    expect(html).toContain("+0.067");
    expect(html).toContain("−0.053");
  });
});
