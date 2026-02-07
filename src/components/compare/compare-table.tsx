"use client";

import { CompareItem } from "@/lib/compare-facts";

interface CompareTableProps {
  items: CompareItem[];
}

interface CompareRow {
  key: string;
  label: string;
}

function buildRows(items: CompareItem[]): CompareRow[] {
  const seen = new Set<string>();
  const rows: CompareRow[] = [];

  for (const item of items) {
    for (const fact of item.facts) {
      if (seen.has(fact.key)) continue;
      seen.add(fact.key);
      rows.push({ key: fact.key, label: fact.label });
    }
  }

  return rows;
}

function readFactValue(item: CompareItem, rowKey: string): { value: string; unit?: string } {
  const match = item.facts.find((fact) => fact.key === rowKey);
  if (!match) return { value: "—" };
  return { value: match.value, unit: match.unit };
}

export function CompareTable({ items }: CompareTableProps) {
  const rows = buildRows(items);

  return (
    <div className="min-w-0 overflow-x-auto border border-border/50 rounded-lg bezel">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="bg-card/70">
            <th className="sticky left-0 z-10 bg-card/90 text-left text-xs uppercase tracking-wider text-muted-foreground p-3 border-b border-border/50">
              Metric
            </th>
            {items.map((item) => (
              <th
                key={item.id}
                className="text-left p-3 border-b border-border/50 min-w-48"
              >
                <p className="font-display text-primary">{item.displayName}</p>
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
            <tr key={row.key} className="odd:bg-muted/10">
              <td className="sticky left-0 z-10 bg-background p-3 border-b border-border/30 text-sm text-muted-foreground">
                {row.label}
              </td>
              {items.map((item) => {
                const fact = readFactValue(item, row.key);
                return (
                  <td key={`${item.id}-${row.key}`} className="p-3 border-b border-border/30">
                    <span className="font-mono text-foreground text-sm">
                      {fact.value}
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
