import type {
  ScientificMeasurement,
  StellarHostParameters,
  StellarSolution,
} from "@/lib/types";

interface StellarParametersPanelProps {
  parameters: StellarHostParameters;
}

function formatNumber(value: number, fractionDigits: number): string {
  return value
    .toFixed(fractionDigits)
    .replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
}

function MeasurementText({
  measurement,
  unit,
  fractionDigits,
}: {
  measurement: ScientificMeasurement;
  unit?: string;
  fractionDigits: number;
}) {
  const prefix = measurement.limit === "upper" ? "<" : measurement.limit === "lower" ? ">" : "";
  return (
    <>
      <span>{prefix}{formatNumber(measurement.value, fractionDigits)}</span>
      {!measurement.limit &&
        (measurement.errorPlus !== undefined || measurement.errorMinus !== undefined) && (
          <span className="ml-1 inline-flex flex-col align-middle text-[0.65em] leading-none">
            {measurement.errorPlus !== undefined && (
              <span>+{formatNumber(measurement.errorPlus, fractionDigits)}</span>
            )}
            {measurement.errorMinus !== undefined && (
              <span>−{formatNumber(measurement.errorMinus, fractionDigits)}</span>
            )}
          </span>
        )}
      {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
    </>
  );
}

function DataPoint({
  label,
  measurement,
  unit,
  fractionDigits = 4,
}: {
  label: string;
  measurement?: ScientificMeasurement;
  unit?: string;
  fractionDigits?: number;
}) {
  if (!measurement) return null;
  return (
    <div className="min-w-0 rounded-md border border-border/30 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-all font-mono text-sm sm:text-base">
        <MeasurementText measurement={measurement} unit={unit} fractionDigits={fractionDigits} />
      </p>
    </div>
  );
}

const SOLUTION_FIELDS: ReadonlyArray<{
  key: keyof StellarSolution;
  label: string;
  unit?: string;
  fractionDigits?: number;
}> = [
  { key: "spectralType", label: "Spectral Type" },
  { key: "effectiveTemperatureK", label: "Effective Temperature", unit: "K", fractionDigits: 2 },
  { key: "radiusSolar", label: "Radius", unit: "R☉", fractionDigits: 4 },
  { key: "massSolar", label: "Mass", unit: "M☉", fractionDigits: 3 },
  { key: "metallicityDex", label: "Metallicity", unit: "dex", fractionDigits: 4 },
  { key: "luminosityLogSolar", label: "Luminosity", unit: "log L☉", fractionDigits: 6 },
  { key: "surfaceGravityLogCgs", label: "Surface Gravity", unit: "log(cm/s²)", fractionDigits: 3 },
  { key: "ageGyr", label: "Age", unit: "Gyr", fractionDigits: 3 },
  { key: "rotationalVelocityKms", label: "v sin(i)", unit: "km/s", fractionDigits: 3 },
  { key: "radialVelocityKms", label: "Radial Velocity", unit: "km/s", fractionDigits: 6 },
  { key: "densityCgs", label: "Density", unit: "g/cm³", fractionDigits: 4 },
  { key: "rotationPeriodDays", label: "Rotation Period", unit: "days", fractionDigits: 3 },
];

function solutionValue(
  solution: StellarSolution,
  field: (typeof SOLUTION_FIELDS)[number],
) {
  const value = solution[field.key];
  if (field.key === "spectralType") {
    return typeof value === "string" ? value : "—";
  }
  if (!value || typeof value === "string") return "—";
  const metallicityRatio = field.key === "metallicityDex" ? solution.metallicityRatio : undefined;
  return (
    <>
      <MeasurementText
        measurement={value}
        unit={field.unit}
        fractionDigits={field.fractionDigits ?? 4}
      />
      {metallicityRatio && (
        <span className="ml-1 text-xs text-muted-foreground">{metallicityRatio}</span>
      )}
    </>
  );
}

export function StellarParametersPanel({ parameters }: StellarParametersPanelProps) {
  const identifiers = Object.values(parameters.identifiers).filter(
    (identifier): identifier is string => typeof identifier === "string",
  );
  const visibleFields = SOLUTION_FIELDS.filter((field) =>
    parameters.solutions.some((solution) => solution[field.key] !== undefined),
  );
  const coordinates = parameters.coordinates;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-wide">Archive overview</h3>
          {parameters.systemReference && (
            <p className="text-xs text-muted-foreground">System source: {parameters.systemReference}</p>
          )}
        </div>
        {identifiers.length > 0 && (
          <p className="mb-3 break-words text-xs text-muted-foreground">
            Identifiers: <span className="text-foreground">{identifiers.join(" · ")}</span>
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DataPoint label="Distance" measurement={parameters.distanceParsecs} unit="pc" fractionDigits={4} />
          <DataPoint label="Parallax" measurement={parameters.parallaxMas} unit="mas" fractionDigits={6} />
          <DataPoint label="Total Proper Motion" measurement={parameters.properMotionMasPerYear} unit="mas/yr" fractionDigits={6} />
          <DataPoint label="Proper Motion (RA)" measurement={parameters.properMotionRaMasPerYear} unit="mas/yr" fractionDigits={6} />
          <DataPoint label="Proper Motion (Dec)" measurement={parameters.properMotionDecMasPerYear} unit="mas/yr" fractionDigits={6} />
          {coordinates.raDeg !== undefined && coordinates.decDeg !== undefined && (
            <div className="min-w-0 rounded-md border border-border/30 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Right Ascension / Declination</p>
              <p className="break-all font-mono text-sm sm:text-base">
                {coordinates.raSexagesimal ?? `${formatNumber(coordinates.raDeg, 6)}°`} · {coordinates.decSexagesimal ?? `${formatNumber(coordinates.decDeg, 6)}°`}
              </p>
            </div>
          )}
          {coordinates.eclipticLongitudeDeg !== undefined && coordinates.eclipticLatitudeDeg !== undefined && (
            <div className="min-w-0 rounded-md border border-border/30 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Ecliptic Longitude / Latitude</p>
              <p className="font-mono text-sm sm:text-base">
                {formatNumber(coordinates.eclipticLongitudeDeg, 5)}° · {formatNumber(coordinates.eclipticLatitudeDeg, 5)}°
              </p>
            </div>
          )}
          {coordinates.galacticLongitudeDeg !== undefined && coordinates.galacticLatitudeDeg !== undefined && (
            <div className="min-w-0 rounded-md border border-border/30 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Galactic Longitude / Latitude</p>
              <p className="font-mono text-sm sm:text-base">
                {formatNumber(coordinates.galacticLongitudeDeg, 5)}° · {formatNumber(coordinates.galacticLatitudeDeg, 5)}°
              </p>
            </div>
          )}
        </div>
      </div>

      {parameters.photometry.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-sm uppercase tracking-wide">Photometry</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {parameters.photometry.map((item) => (
              <DataPoint
                key={`${item.catalog}:${item.band}`}
                label={`${item.band}${item.catalog ? ` (${item.catalog})` : ""}`}
                measurement={item.magnitude}
                unit="mag"
                fractionDigits={5}
              />
            ))}
          </div>
        </div>
      )}

      {parameters.abundances.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-sm uppercase tracking-wide">Element abundances</h3>
            <p className="text-xs text-muted-foreground">Hypatia median ± spread</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {parameters.abundances.map((abundance) => (
              <div key={abundance.notation} className="rounded-md border border-border/30 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{abundance.notation}</p>
                <p className="font-mono text-sm sm:text-base">
                  {formatNumber(abundance.medianDex, 2)}
                  {abundance.spreadDex !== undefined && ` ± ${formatNumber(abundance.spreadDex, 2)}`}
                  <span className="ml-1 text-xs text-muted-foreground">dex</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {parameters.solutions.length > 0 && visibleFields.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-sm uppercase tracking-wide">
              Published stellar solutions ({parameters.solutions.length})
            </h3>
            <p className="text-xs text-muted-foreground">Scroll horizontally to compare sources</p>
          </div>
          <div
            className="overflow-x-auto rounded-md border border-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="region"
            aria-label="Published stellar solutions comparison"
            tabIndex={0}
          >
            <table className="min-w-max border-collapse text-left text-xs">
              <caption className="sr-only">Published stellar parameter solutions by source</caption>
              <thead className="bg-muted/40">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 min-w-44 border-r border-border/30 bg-muted px-3 py-2 font-display">Source</th>
                  {visibleFields.map((field) => (
                    <th key={field.key} scope="col" className="min-w-36 border-r border-border/30 px-3 py-2 font-display last:border-r-0">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parameters.solutions.map((solution, index) => (
                  <tr key={`${solution.reference}:${index}`} className="border-t border-border/30 align-top">
                    <th scope="row" className="sticky left-0 z-10 border-r border-border/30 bg-card px-3 py-2 font-medium text-foreground">
                      {solution.reference}
                    </th>
                    {visibleFields.map((field) => (
                      <td key={field.key} className="border-r border-border/30 px-3 py-2 font-mono last:border-r-0">
                        {solutionValue(solution, field)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
