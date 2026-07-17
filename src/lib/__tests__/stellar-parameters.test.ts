import { describe, expect, it } from "bun:test";
import {
  mapStellarHostParameters,
  type HypatiaCompositionSource,
  type StellarHostSourceRow,
} from "@/lib/stellar-parameters";

const baseRow: StellarHostSourceRow = {
  hostname: "11 UMi",
  hd_name: "HD 136726",
  hip_name: "HIP 74793",
  tic_id: "TIC 230061010",
  gaia_dr2_id: "Gaia DR2 1696798367260229376",
  gaia_dr3_id: "Gaia DR3 1696798367260229376",
  sy_refname: "<a href='https://example.test'>TICv8</a>",
  ra: 229.2745954,
  rastr: "15h17m05.90s",
  dec: 71.8239428,
  decstr: "+71d49m26.19s",
  glon: 108.719,
  glat: 41.04437,
  elon: 141.64312,
  elat: 74.95821,
  sy_dist: 125.321,
  sy_disterr1: 1.9765,
  sy_disterr2: -1.9765,
  sy_plx: 7.95388,
  sy_plxerr1: 0.124857,
  sy_plxerr2: -0.124857,
  sy_pm: 10.6790187,
  sy_pmerr1: 0.2188062,
  sy_pmerr2: -0.2188062,
  sy_pmra: 3.42996,
  sy_pmraerr1: 0.231822,
  sy_pmraerr2: -0.231822,
  sy_pmdec: 10.1132,
  sy_pmdecerr1: 0.217259,
  sy_pmdecerr2: -0.217259,
  sy_snum: 1,
  sy_pnum: 1,
  sy_mnum: 0,
  cb_flag: 0,
  sy_vmag: 5.013,
  sy_vmagerr1: 0.005,
  sy_vmagerr2: -0.005,
  sy_tmag: 3.82294,
  sy_tmagerr1: 0.0075,
  sy_tmagerr2: -0.0075,
  sy_jmag: 2.876,
  sy_jmagerr1: 0.23,
  sy_jmagerr2: -0.23,
  sy_hmag: 2.091,
  sy_hmagerr1: 0.194,
  sy_hmagerr2: -0.194,
  sy_kmag: 1.939,
  sy_kmagerr1: 0.27,
  sy_kmagerr2: -0.27,
  st_refname:
    "<a href='https://ui.adsabs.harvard.edu/abs/2018A&A...616A...1G/abstract'>Gaia DR2</a>",
  st_spectype: null,
  st_teff: 4248.7,
  st_tefferr1: 262.06,
  st_tefferr2: -109.7,
  st_tefflim: 0,
  st_rad: 30.262005,
  st_raderr1: 1.62539,
  st_raderr2: -3.41409,
  st_radlim: 0,
  st_mass: null,
  st_masserr1: null,
  st_masserr2: null,
  st_masslim: null,
  st_met: null,
  st_meterr1: null,
  st_meterr2: null,
  st_metlim: null,
  st_metratio: null,
  st_lum: 2.4295144,
  st_lumerr1: 0.0080083,
  st_lumerr2: -0.0081588,
  st_lumlim: 0,
  st_logg: null,
  st_loggerr1: null,
  st_loggerr2: null,
  st_logglim: null,
  st_age: null,
  st_ageerr1: null,
  st_ageerr2: null,
  st_agelim: null,
  st_vsin: null,
  st_vsinerr1: null,
  st_vsinerr2: null,
  st_vsinlim: null,
  st_radv: -17.520228,
  st_radverr1: 0.1538165,
  st_radverr2: -0.1538165,
  st_radvlim: 0,
  st_dens: null,
  st_denserr1: null,
  st_denserr2: null,
  st_denslim: null,
  st_rotp: null,
  st_rotperr1: null,
  st_rotperr2: null,
  st_rotplim: null,
};

describe("mapStellarHostParameters", () => {
  it("maps overview, photometry, asymmetric errors, and every published solution", () => {
    const secondRow: StellarHostSourceRow = {
      ...baseRow,
      st_refname: "<a href='https://example.test'>Dollinger et al. 2009</a>",
      st_spectype: "K4 III",
      st_teff: 4340,
      st_tefferr1: 70,
      st_tefferr2: -70,
      st_rad: 24.08,
      st_raderr1: 1.84,
      st_raderr2: -1.84,
      st_mass: 1.8,
      st_masserr1: 0.25,
      st_masserr2: -0.25,
      st_met: 0.04,
      st_meterr1: 0.04,
      st_meterr2: -0.04,
      st_metratio: "[Fe/H]",
    };

    const parameters = mapStellarHostParameters([baseRow, secondRow], []);

    expect(parameters.systemReference).toBe("TICv8");
    expect(parameters.identifiers.hip).toBe("HIP 74793");
    expect(parameters.distanceParsecs).toEqual({
      value: 125.321,
      errorPlus: 1.9765,
      errorMinus: 1.9765,
    });
    expect(parameters.photometry.find((item) => item.band === "V")?.magnitude).toEqual({
      value: 5.013,
      errorPlus: 0.005,
      errorMinus: 0.005,
    });
    expect(parameters.solutions).toHaveLength(2);
    expect(parameters.solutions[0]?.reference).toBe("Gaia DR2");
    expect(parameters.solutions[0]?.effectiveTemperatureK).toEqual({
      value: 4248.7,
      errorPlus: 262.06,
      errorMinus: 109.7,
    });
    expect(parameters.solutions[1]?.metallicityRatio).toBe("[Fe/H]");
  });

  it("maps Hypatia medians and spreads while dropping not-found records", () => {
    const abundances: HypatiaCompositionSource[] = [
      {
        name: "*  11 UMi",
        element: "Fe",
        median_value: 0.01,
        plusminus: 0.18,
        solarnorm: "lodders09",
      },
      {
        name: "*  11 UMi",
        element: "Ba_II",
        median_value: -0.63,
        plusminus: 0.25,
        solarnorm: "lodders09",
      },
      {
        name: "not-found",
        requested_element: "C",
      },
    ];

    const parameters = mapStellarHostParameters([baseRow], abundances);

    expect(parameters.abundances).toEqual([
      {
        element: "Fe",
        notation: "[Fe/H]",
        medianDex: 0.01,
        spreadDex: 0.18,
        solarNormalization: "lodders09",
      },
      {
        element: "Ba II",
        notation: "[BaII/H]",
        medianDex: -0.63,
        spreadDex: 0.25,
        solarNormalization: "lodders09",
      },
    ]);
  });
});
