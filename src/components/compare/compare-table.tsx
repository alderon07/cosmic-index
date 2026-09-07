"use client";

import {
  CompareDomain,
  CompareItem,
  MAX_COMPARE_ITEMS,
  getCompareFactLabel,
  getCompareFactSchema,
  isDetailOnlyFactKey,
} from "@/lib/compare-facts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CompareTableProps {
  items: CompareItem[];
}

interface CompareRow {
  key: string;
  label: string;
}

function buildRows(items: CompareItem[]): CompareRow[] {
  if (items.length === 0) return [];

  const domain = items[0].domain;
  const schema = getCompareFactSchema(domain);
  const schemaKeys = new Set(schema.map((fact) => fact.key));

  const rows: CompareRow[] = schema.map((fact) => ({ key: fact.key, label: fact.label }));

  // Preserve schema order, then append any extra keys from upstream data.
  const extras = new Set<string>();
  for (const item of items) {
    for (const fact of item.facts) {
      if (!schemaKeys.has(fact.key)) {
        extras.add(fact.key);
      }
    }
  }

  for (const key of Array.from(extras).sort()) {
    rows.push({ key, label: getCompareFactLabel(domain, key) });
  }

  return rows;
}

function readFactValue(
  item: CompareItem,
  rowKey: string
): { value: string; unit?: string; missingReason?: "not-loaded" | "unavailable" } {
  const match = item.facts.find((fact) => fact.key === rowKey);
  if (match) {
    return { value: match.value, unit: match.unit };
  }

  if (item.snapshotLevel === "list" && isDetailOnlyFactKey(item.domain, rowKey)) {
    return { value: "—", missingReason: "not-loaded" };
  }

  return { value: "—", missingReason: "unavailable" };
}

export function CompareTable({ items }: CompareTableProps) {
  const rows = buildRows(items);
  const domain: CompareDomain | null = items[0]?.domain ?? null;
  const metricColumnMinWidthRem = 10;
  const itemColumnMinWidthRem = 12;
  const tableMinWidthRem =
    metricColumnMinWidthRem +
    itemColumnMinWidthRem * Math.max(items.length, MAX_COMPARE_ITEMS);
  const toneClass =
    domain === "stars"
      ? {
          tableBorder: "border-uranium-green/35",
          headerBg: "bg-uranium-green/8",
          metricBg: "bg-uranium-green/6",
          metricText: "text-uranium-green/90",
          nameText: "text-uranium-green",
          oddBg: "odd:bg-uranium-green/[0.04]",
        }
      : domain === "small-bodies"
      ? {
          tableBorder: "border-secondary/35",
          headerBg: "bg-secondary/8",
          metricBg: "bg-secondary/6",
          metricText: "text-secondary/90",
          nameText: "text-secondary",
          oddBg: "odd:bg-secondary/[0.04]",
        }
      : {
          tableBorder: "border-primary/35",
          headerBg: "bg-primary/8",
          metricBg: "bg-primary/6",
          metricText: "text-primary/90",
          nameText: "text-primary",
          oddBg: "odd:bg-primary/[0.04]",
        };

  return (
    <div className={cn("min-w-0 overflow-x-auto border rounded-lg bezel focus-visible:outline-2 focus-visible:outline-primary", toneClass.tableBorder)} tabIndex={0} role="region" aria-label="Object comparison, scroll horizontally for more columns">
      <table className="w-full border-collapse" style={{ minWidth: `${tableMinWidthRem}rem` }}>
        <caption className="caption-top p-3 text-left text-sm leading-6 text-muted-foreground">
          Catalog snapshots saved on this device. To update a record, remove it and add it again from its detail page.
          {domain === "exoplanets" ? " Mass provenance and reported bounds matter. An absent provenance label in an older snapshot means unknown, not measured. Uncertainties appear only where supplied; a plain number does not imply an exact value." : " Missing values are unknown."}
        </caption>
        <thead>
          <tr className={cn("bg-card/70", toneClass.headerBg)}>
            <th
              scope="col"
              className={cn(
                "sticky left-0 z-10 min-w-40 text-left text-xs uppercase tracking-wider p-3 border-b border-border/50",
                toneClass.metricBg,
                toneClass.metricText
              )}
            >
              Metric
            </th>
            {items.map((item) => (
              <th
                scope="col"
                key={item.id}
                className={cn("text-left p-3 border-b border-border/50 min-w-48", toneClass.headerBg)}
              >
                <p className={cn("font-display", toneClass.nameText)}>{item.displayName}</p>
                {item.subtitle ? (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {item.subtitle}
                  </p>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={toneClass.oddBg}>
              <th
                scope="row"
                className={cn(
                  "sticky left-0 z-10 p-3 border-b border-border/30 text-sm text-muted-foreground",
                  toneClass.metricBg
                )}
              >
                {row.label}
              </th>
              {items.map((item) => {
                const fact = readFactValue(item, row.key);
                return (
                  <td key={`${item.id}-${row.key}`} className="p-3 border-b border-border/30">
                    <span className="font-mono text-foreground text-sm">
                      {fact.missingReason ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground">—</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {fact.missingReason === "not-loaded"
                              ? "Not loaded on this page."
                              : "Not available in this dataset."}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        fact.value
                      )}
                    </span>
                    {fact.unit ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {fact.unit}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
