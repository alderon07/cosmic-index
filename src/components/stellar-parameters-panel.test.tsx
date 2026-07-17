import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StellarParametersPanel } from "@/components/stellar-parameters-panel";
import type { StellarHostParameters } from "@/lib/types";

const parameters: StellarHostParameters = {
  systemReference: "TICv8",
  identifiers: { hip: "HIP 74793", hd: "HD 136726" },
  coordinates: {
    raDeg: 229.2745954,
    decDeg: 71.8239428,
    raSexagesimal: "15h17m05.90s",
    decSexagesimal: "+71d49m26.19s",
    galacticLongitudeDeg: 108.719,
    galacticLatitudeDeg: 41.04437,
    eclipticLongitudeDeg: 141.64312,
    eclipticLatitudeDeg: 74.95821,
  },
  distanceParsecs: { value: 125.321, errorPlus: 1.9765, errorMinus: 1.9765 },
  parallaxMas: { value: 7.95388, errorPlus: 0.124857, errorMinus: 0.124857 },
  properMotionMasPerYear: { value: 10.6790187, errorPlus: 0.2188062, errorMinus: 0.2188062 },
  properMotionRaMasPerYear: { value: 3.42996, errorPlus: 0.231822, errorMinus: 0.231822 },
  properMotionDecMasPerYear: { value: 10.1132, errorPlus: 0.217259, errorMinus: 0.217259 },
  photometry: [{ band: "V", catalog: "Johnson", magnitude: { value: 5.013, errorPlus: 0.005, errorMinus: 0.005 } }],
  abundances: [{ element: "Fe", notation: "[Fe/H]", medianDex: 0.01, spreadDex: 0.18, solarNormalization: "lodders09" }],
  solutions: [{
    reference: "Gaia DR2",
    effectiveTemperatureK: { value: 4248.7, errorPlus: 262.06, errorMinus: 109.7 },
    radiusSolar: { value: 30.262005, errorPlus: 1.62539, errorMinus: 3.41409 },
    luminosityLogSolar: { value: 2.4295144, errorPlus: 0.0080083, errorMinus: 0.0081588 },
    radialVelocityKms: { value: -17.520228, errorPlus: 0.1538165, errorMinus: 0.1538165 },
  }],
};

describe("StellarParametersPanel", () => {
  it("renders overview, photometry, abundances, uncertainties, and solution sources", () => {
    const html = renderToStaticMarkup(<StellarParametersPanel parameters={parameters} />);

    expect(html).toContain("HIP 74793");
    expect(html).toContain("Total Proper Motion");
    expect(html).toContain("Photometry");
    expect(html).toContain("[Fe/H]");
    expect(html).toContain("Gaia DR2");
    expect(html).toContain("+262");
    expect(html).toContain("−109.7");
    expect(html).toContain('aria-label="Published stellar solutions comparison"');
  });
});
