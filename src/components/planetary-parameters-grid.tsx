import type {
  PlanetaryMeasurement,
  PlanetaryParameters,
} from "@/lib/types";

interface PlanetaryParametersGridProps {
  parameters: PlanetaryParameters;
}

interface ParameterItem {
  label: string;
  measurement?: PlanetaryMeasurement;
  unit?: string;
  fractionDigits: number;
  suffix?: string;
}

function massLabel(provenance: string | undefined, unit: string): string {
  if (provenance === "Msini") return `M sin(i) (${unit})`;
  if (provenance === "Msin(i)/sin(i)") {
    return `M sin(i) / sin(i) (${unit})`;
  }
  return `Planet Mass (${unit})`;
}

function formatValue(value: number, fractionDigits: number, trim = false): string {
  const formatted = value.toFixed(fractionDigits);
  return trim ? formatted.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1") : formatted;
}

function MeasurementValue({
  measurement,
  fractionDigits,
  unit,
  suffix,
}: Omit<ParameterItem, "label"> & { measurement: PlanetaryMeasurement }) {
  const trim = measurement.limit !== undefined;
  const value = formatValue(measurement.value, fractionDigits, trim);
  const prefix = measurement.limit === "upper" ? "<" : measurement.limit === "lower" ? ">" : "";

  return (
    <>
      <span>{prefix}{value}</span>
      {measurement.limit === undefined &&
        (measurement.errorPlus !== undefined || measurement.errorMinus !== undefined) && (
          <span className="ml-1 inline-flex flex-col align-middle text-[0.65em] leading-none">
            {measurement.errorPlus !== undefined && (
              <span>+{formatValue(measurement.errorPlus, fractionDigits)}</span>
            )}
            {measurement.errorMinus !== undefined && (
              <span>−{formatValue(measurement.errorMinus, fractionDigits)}</span>
            )}
          </span>
        )}
      {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
      {suffix && <span className="ml-1 text-xs text-muted-foreground">({suffix})</span>}
    </>
  );
}

export function PlanetaryParametersGrid({ parameters }: PlanetaryParametersGridProps) {
  const items: ParameterItem[] = [
    {
      label: "Orbital Period",
      measurement: parameters.orbitalPeriodDays,
      unit: "days",
      fractionDigits: 3,
    },
    {
      label: "Semi-Major Axis",
      measurement: parameters.semiMajorAxisAu,
      unit: "au",
      fractionDigits: 4,
    },
    {
      label: massLabel(parameters.massProvenance, "Earth masses"),
      measurement: parameters.massEarth,
      fractionDigits: 2,
    },
    {
      label: massLabel(parameters.massProvenance, "Jupiter masses"),
      measurement: parameters.massJupiter,
      fractionDigits: 4,
    },
    {
      label: "Eccentricity",
      measurement: parameters.eccentricity,
      fractionDigits: 4,
    },
    {
      label: "Epoch of Periastron",
      measurement: parameters.periastronEpoch,
      unit: "days",
      suffix: parameters.timeSystem,
      fractionDigits: 2,
    },
    {
      label: "Argument of Periastron",
      measurement: parameters.argumentOfPeriastronDeg,
      unit: "deg",
      fractionDigits: 1,
    },
    {
      label: "Radial Velocity Semi-Amplitude",
      measurement: parameters.radialVelocitySemiAmplitudeMps,
      unit: "m/s",
      fractionDigits: 2,
    },
  ];

  const visibleItems = items.filter(
    (item): item is ParameterItem & { measurement: PlanetaryMeasurement } =>
      item.measurement !== undefined,
  );

  if (visibleItems.length === 0 && !parameters.reference) return null;

  return (
    <div className="space-y-3">
      {parameters.reference && (
        <p className="text-xs text-muted-foreground">
          Parameter source: <span className="text-foreground">{parameters.reference}</span>
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-md border border-border/30 bg-muted/20 p-3"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="break-all font-mono text-sm sm:text-lg">
              <MeasurementValue {...item} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
