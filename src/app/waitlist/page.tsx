import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WaitlistCta } from "@/components/waitlist/waitlist-cta";
import { PRO_FEATURES } from "@/lib/pro-features";
import { getWaitlistEnabled } from "@/lib/runtime-mode";
import { TIER_LIMITS } from "@/lib/tier-limits";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Pro Waitlist",
  description: "Join the Cosmic Index Pro waitlist.",
};

const freeLimits = TIER_LIMITS.free;
const proLimits = TIER_LIMITS.pro;
const PLAN_LIMIT_COMPARISON = [
  {
    label: "Saved objects",
    free: freeLimits.MAX_SAVED_OBJECTS.toLocaleString(),
    pro: proLimits.MAX_SAVED_OBJECTS.toLocaleString(),
  },
  {
    label: "Saves per rolling 24h",
    free: freeLimits.SAVES_PER_DAY.toLocaleString(),
    pro: proLimits.SAVES_PER_DAY.toLocaleString(),
  },
  {
    label: "Saved searches",
    free: freeLimits.MAX_SAVED_SEARCHES.toLocaleString(),
    pro: proLimits.MAX_SAVED_SEARCHES.toLocaleString(),
  },
  {
    label: "Export requests / hour",
    free: freeLimits.EXPORT_REQUESTS_PER_HOUR.toLocaleString(),
    pro: proLimits.EXPORT_REQUESTS_PER_HOUR.toLocaleString(),
  },
  {
    label: "Export rows / hour",
    free: freeLimits.EXPORT_ROWS_PER_HOUR.toLocaleString(),
    pro: proLimits.EXPORT_ROWS_PER_HOUR.toLocaleString(),
  },
  {
    label: "Max rows per export",
    free: freeLimits.MAX_EXPORT_ROWS.toLocaleString(),
    pro: proLimits.MAX_EXPORT_ROWS.toLocaleString(),
  },
  {
    label: "CSV export max rows",
    free: freeLimits.CSV_MAX_ROWS.toLocaleString(),
    pro: proLimits.CSV_MAX_ROWS.toLocaleString(),
  },
];

export default function WaitlistPage() {
  const waitlistEnabled = getWaitlistEnabled();

  return (
    <div className="shell-container py-10 sm:py-12">
      <Card tone={ACCOUNT_CARD_TONE} className="mx-auto max-w-4xl">
        <CardHeader className="space-y-4 pb-1">
          <Badge
            variant="outline"
            className="w-fit border-orange-300/30 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-orange-100/80"
          >
            <span className="h-2 w-2 rounded-full bg-uranium-green" />
            Pro Waitlist
          </Badge>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-uranium-green" />
            Get Notified When Pro Opens
          </CardTitle>
          <CardDescription>
            Join the waitlist to hear about Pro billing availability and rollout updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {waitlistEnabled ? (
            <WaitlistCta source="pro_badge" />
          ) : (
            <div className="space-y-3 rounded-md border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                The waitlist is currently disabled for this environment.
              </p>
            </div>
          )}

          <div className="rounded-md border border-border/60 bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/90">
              What You Get With Pro
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature.label} className="rounded-md border border-border/50 bg-black/10 p-3">
                  <div className="flex items-start gap-2">
                    <feature.icon className="mt-0.5 h-4 w-4 shrink-0 text-uranium-green" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{feature.label}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/90">
              Current Tier Limits
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Last updated: March 1, 2026 (UTC)</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[58%]" />
                  <col className="w-[21%]" />
                  <col className="w-[21%]" />
                </colgroup>
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
                    <th className="py-1 text-left font-medium">Capability</th>
                    <th className="py-1 text-right font-medium">Free</th>
                    <th className="py-1 text-right font-medium">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_LIMIT_COMPARISON.map((limit) => (
                    <tr key={limit.label}>
                      <td className="py-1.5 text-muted-foreground">{limit.label}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums text-foreground">{limit.free}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums text-uranium-green">{limit.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Limits are enforced for signed-in users. Fireball events are excluded from saved objects.
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Joining requires a signed-in account.
            </p>
            <p className="mt-2">
              You can also manage billing at{" "}
              <Link href="/settings/billing" className="text-primary hover:underline">
                Settings → Billing
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
