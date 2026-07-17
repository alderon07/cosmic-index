import { mapPlanetaryParameters } from "../planetary-parameters";

describe("planetary parameter mapping", () => {
  it("maps the DMPP-2 d default parameter set with uncertainties and limits", () => {
    const result = mapPlanetaryParameters({
      pl_refname:
        '<a refstr=STANDING_ET_AL_2026 href=https://ui.adsabs.harvard.edu/abs/2026MNRAS.547ag370S/abstract target=ref>Standing et al. 2026</a>',
      pl_orbper: 16.491,
      pl_orbpererr1: 0.067,
      pl_orbpererr2: -0.053,
      pl_orbperlim: 0,
      pl_orbsmax: 0.1432,
      pl_orbsmaxerr1: 0.0012,
      pl_orbsmaxerr2: -0.0013,
      pl_orbsmaxlim: 0,
      pl_bmasse: 91.79,
      pl_bmasseerr1: 6.11,
      pl_bmasseerr2: -7.32,
      pl_bmassj: 0.28880364,
      pl_bmassjerr1: 0.01922421,
      pl_bmassjerr2: -0.0230313,
      pl_bmassprov: "Msini",
      pl_orbeccen: 0.1,
      pl_orbeccenerr1: null,
      pl_orbeccenerr2: null,
      pl_orbeccenlim: 1,
      pl_orbtper: 2457516.66,
      pl_orbtpererr1: 3.69,
      pl_orbtpererr2: -4.02,
      pl_orbtperlim: 0,
      pl_tsystemref: "BJD",
      pl_orblper: 267,
      pl_orblpererr1: 57.9,
      pl_orblpererr2: -207,
      pl_orblperlim: 0,
      pl_rvamp: 18.21,
      pl_rvamperr1: 1.32,
      pl_rvamperr2: -1.38,
      pl_rvamplim: 0,
    });

    expect(result).toEqual({
      reference: "Standing et al. 2026",
      orbitalPeriodDays: {
        value: 16.491,
        errorPlus: 0.067,
        errorMinus: 0.053,
      },
      semiMajorAxisAu: {
        value: 0.1432,
        errorPlus: 0.0012,
        errorMinus: 0.0013,
      },
      massEarth: {
        value: 91.79,
        errorPlus: 6.11,
        errorMinus: 7.32,
      },
      massJupiter: {
        value: 0.28880364,
        errorPlus: 0.01922421,
        errorMinus: 0.0230313,
      },
      massProvenance: "Msini",
      eccentricity: { value: 0.1, limit: "upper" },
      periastronEpoch: {
        value: 2457516.66,
        errorPlus: 3.69,
        errorMinus: 4.02,
      },
      timeSystem: "BJD",
      argumentOfPeriastronDeg: {
        value: 267,
        errorPlus: 57.9,
        errorMinus: 207,
      },
      radialVelocitySemiAmplitudeMps: {
        value: 18.21,
        errorPlus: 1.32,
        errorMinus: 1.38,
      },
    });
  });
});
