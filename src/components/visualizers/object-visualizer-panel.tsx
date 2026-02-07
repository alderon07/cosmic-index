"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrbitScaleStrip } from "@/components/visualizers/orbit-scale-strip";
import { MetricGauge } from "@/components/visualizers/metric-gauge";
import { AnyCosmicObject, isExoplanet, isSmallBody, isStar } from "@/lib/types";
import { isDegradeModeEnabled, recordPerformanceSample } from "@/lib/performance-mode";
import { trackEvent } from "@/lib/analytics-events";
import { Gauge } from "lucide-react";

const VISUALIZER_BUDGET_MS = 80;

function clampPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return normalized;
}

function logPercent(value: number, min: number, max: number): number {
  if (value <= 0 || min <= 0 || max <= min) return 0;
  const normalized = ((Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * 100;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return normalized;
}

interface ObjectVisualizerPanelProps {
  object: AnyCosmicObject;
}

export function ObjectVisualizerPanel({ object }: ObjectVisualizerPanelProps) {
  const degradeMode = isDegradeModeEnabled("object-visualizer");

  useEffect(() => {
    const start = performance.now();
    requestAnimationFrame(() => {
      const duration = performance.now() - start;
      recordPerformanceSample({
        component: "object-visualizer",
        metric: "render",
        durationMs: duration,
        budgetMs: VISUALIZER_BUDGET_MS,
      });
      trackEvent("visualizer_rendered", {
        objectType: object.type,
        metricCount: object.keyFacts.length,
      });
    });
  }, [object.id, object.keyFacts.length, object.type]);

  const accentClassName = isExoplanet(object)
    ? "bg-primary"
    : isStar(object)
    ? "bg-uranium-green"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "bg-radium-teal"
    : "bg-secondary";

  return (
    <Card className={`bg-card border-border/50 bezel ${degradeMode ? "" : "scanlines"}`}>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          Instrument Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isExoplanet(object) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricGauge
              label="Radius Index"
              valueLabel={
                object.radiusEarth != null
                  ? `${object.radiusEarth.toFixed(2)} R⊕`
                  : "Unknown"
              }
              valuePercent={
                object.radiusEarth != null
                  ? clampPercent(object.radiusEarth, 0, 15)
                  : null
              }
              accentClassName={accentClassName}
              hint="Earth-sized to super-Jovian scale"
            />
            <MetricGauge
              label="Mass Index"
              valueLabel={
                object.massEarth != null
                  ? `${object.massEarth.toFixed(2)} M⊕`
                  : "Unknown"
              }
              valuePercent={
                object.massEarth != null
                  ? clampPercent(object.massEarth, 0, 500)
                  : null
              }
              accentClassName={accentClassName}
              hint={object.massIsEstimated ? "Estimated mass value" : "Measured mass value"}
            />
            <OrbitScaleStrip
              label="Orbital Period"
              markerLabel={
                object.orbitalPeriodDays != null
                  ? `${object.orbitalPeriodDays.toFixed(2)} days`
                  : "Unknown"
              }
              markerPercent={
                object.orbitalPeriodDays != null
                  ? logPercent(object.orbitalPeriodDays, 0.1, 10000)
                  : null
              }
              accentClassName={accentClassName}
              startLabel="0.1d"
              endLabel="10,000d"
            />
            <OrbitScaleStrip
              label="Distance from Earth"
              markerLabel={
                object.distanceParsecs != null
                  ? `${object.distanceParsecs.toFixed(1)} pc`
                  : "Unknown"
              }
              markerPercent={
                object.distanceParsecs != null
                  ? logPercent(object.distanceParsecs, 0.1, 10000)
                  : null
              }
              accentClassName={accentClassName}
              startLabel="Nearby"
              endLabel="Deep catalog"
            />
          </div>
        ) : null}

        {isStar(object) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricGauge
              label="Temperature Index"
              valueLabel={
                object.starTempK != null ? `${object.starTempK.toFixed(0)} K` : "Unknown"
              }
              valuePercent={
                object.starTempK != null ? clampPercent(object.starTempK, 2000, 40000) : null
              }
              accentClassName={accentClassName}
              hint="Approximate stellar temperature scale"
            />
            <MetricGauge
              label="Mass Index"
              valueLabel={
                object.starMassSolar != null
                  ? `${object.starMassSolar.toFixed(2)} M☉`
                  : "Unknown"
              }
              valuePercent={
                object.starMassSolar != null
                  ? clampPercent(object.starMassSolar, 0.1, 10)
                  : null
              }
              accentClassName={accentClassName}
              hint="Relative to Sun mass"
            />
            <OrbitScaleStrip
              label="Planet Count"
              markerLabel={`${object.planetCount} known`}
              markerPercent={clampPercent(object.planetCount, 0, 12)}
              accentClassName={accentClassName}
              startLabel="0"
              endLabel="12+"
            />
            <OrbitScaleStrip
              label="Distance from Earth"
              markerLabel={
                object.distanceParsecs != null
                  ? `${object.distanceParsecs.toFixed(1)} pc`
                  : "Unknown"
              }
              markerPercent={
                object.distanceParsecs != null
                  ? logPercent(object.distanceParsecs, 0.1, 10000)
                  : null
              }
              accentClassName={accentClassName}
              startLabel="Nearby"
              endLabel="Farther host stars"
            />
          </div>
        ) : null}

        {isSmallBody(object) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricGauge
              label="Diameter Index"
              valueLabel={
                object.diameterKm != null
                  ? `${object.diameterKm.toFixed(2)} km`
                  : "Unknown"
              }
              valuePercent={
                object.diameterKm != null
                  ? logPercent(object.diameterKm, 0.01, 1000)
                  : null
              }
              accentClassName={accentClassName}
              hint="Logarithmic scale for small to large bodies"
            />
            <MetricGauge
              label="Brightness Index (H)"
              valueLabel={
                object.absoluteMagnitude != null
                  ? object.absoluteMagnitude.toFixed(1)
                  : "Unknown"
              }
              valuePercent={
                object.absoluteMagnitude != null
                  ? 100 - clampPercent(object.absoluteMagnitude, 10, 30)
                  : null
              }
              accentClassName={accentClassName}
              hint="Lower H means brighter/larger object"
            />
            <OrbitScaleStrip
              label="Hazard Classification"
              markerLabel={object.isPha ? "PHA" : object.isNeo ? "NEO" : "Standard"}
              markerPercent={object.isPha ? 100 : object.isNeo ? 60 : 20}
              accentClassName={accentClassName}
              startLabel="Catalog"
              endLabel="Hazard flagged"
            />
            <OrbitScaleStrip
              label="Orbit Class"
              markerLabel={object.orbitClass}
              markerPercent={null}
              accentClassName={accentClassName}
              startLabel="Class"
              endLabel="Descriptor"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
