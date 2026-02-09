"use client";

import {
  CompareDomain,
  CompareItem,
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
    <div className={cn("min-w-0 overflow-x-auto border rounded-lg bezel", toneClass.tableBorder)}>
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className={cn("bg-card/70", toneClass.headerBg)}>
            <th
              className={cn(
                "sticky left-0 z-10 text-left text-xs uppercase tracking-wider p-3 border-b border-border/50",
                toneClass.metricBg,
                toneClass.metricText
              )}
            >
              Metric
            </th>
            {items.map((item) => (
              <th
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
              <td
                className={cn(
                  "sticky left-0 z-10 p-3 border-b border-border/30 text-sm text-muted-foreground",
                  toneClass.metricBg
                )}
              >
                {row.label}
              </td>
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
