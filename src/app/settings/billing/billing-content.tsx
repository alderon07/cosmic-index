"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProBadge } from "@/components/pro-badge";
import { WaitlistCta } from "@/components/waitlist/waitlist-cta";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";
import { Check, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { TIER_LIMITS } from "@/lib/tier-limits";
import { PRO_FEATURES } from "@/lib/pro-features";

/**
 * Billing Content (Client Component)
 *
 * Handles:
 * - Displaying current tier
 * - Upgrade button (creates checkout session)
 * - Manage subscription button (creates portal session)
 * - Success/cancel message from Stripe redirect
 */

interface BillingContentProps {
  tier: "free" | "pro";
  hasStripeCustomer: boolean;
  proBillingEnabled: boolean;
  waitlistEnabled: boolean;
}

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

export function BillingContent({
  tier,
  hasStripeCustomer,
  proBillingEnabled,
  waitlistEnabled,
}: BillingContentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const isMockFlow = searchParams.get("mock") === "1";

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No portal URL returned");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to create portal session:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Cancel Messages */}
      {success && (
        <div className="p-4 rounded-lg border border-uranium-green/50 bg-uranium-green/10 text-uranium-green">
          <p className="font-medium">Welcome to Pro!</p>
          <p className="text-sm opacity-80">
            {isMockFlow
              ? "Mock billing flow completed. Pro features are enabled locally."
              : "Your subscription is now active. Enjoy all the premium features!"}
          </p>
        </div>
      )}

      {canceled && (
        <div className="p-4 rounded-lg border border-muted-foreground/50 bg-muted/50 text-muted-foreground">
          <p className="text-sm">
            {isMockFlow
              ? "Mock manage-subscription flow completed. Account was switched to free tier."
              : "Checkout was canceled. You can upgrade anytime when you&apos;re ready."}
          </p>
        </div>
      )}

      {/* Current Plan Card */}
      <Card tone={ACCOUNT_CARD_TONE}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <CardDescription>
                {tier === "pro"
                  ? "You have access to all premium features"
                  : "Upgrade to unlock premium features"}
              </CardDescription>
            </div>
            {tier === "pro" ? (
              <ProBadge size="default" />
            ) : (
              <span className="text-sm text-muted-foreground px-2 py-1 rounded border border-border">
                Free
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tier === "pro" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Thank you for supporting Cosmic Index!
              </p>
              {!proBillingEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Billing controls are temporarily unavailable.
                </p>
              ) : hasStripeCustomer ? (
                <Button
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                  variant="outline"
                  className="gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Manage Subscription
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {proBillingEnabled ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="gap-2 bg-primary hover:bg-primary/85 text-primary-foreground"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Upgrade to Pro
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Pro billing is coming soon.
                  </p>
                  {waitlistEnabled ? (
                    <WaitlistCta source="billing" compact />
                  ) : null}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pro Features Card */}
      <Card tone={ACCOUNT_CARD_TONE}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-uranium-green" />
            Pro Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {PRO_FEATURES.map((feature) => (
              <li key={feature.label} className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded ${
                    tier === "pro"
                      ? "bg-uranium-green/20 text-uranium-green"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tier === "pro" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <feature.icon className="w-4 h-4" />
                  )}
                </div>
                <span className={tier === "pro" ? "" : "text-muted-foreground"}>
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Tier Limits Card */}
      <Card tone={ACCOUNT_CARD_TONE}>
        <CardHeader>
          <CardTitle className="text-lg">Tier Limits</CardTitle>
          <CardDescription>
            Current enforced limits for signed-in users
          </CardDescription>
          <p className="text-xs text-muted-foreground">Last updated: March 1, 2026 (UTC)</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[58%]" />
                <col className="w-[21%]" />
                <col className="w-[21%]" />
              </colgroup>
              <thead>
                <tr className="text-xs uppercase tracking-[0.12em] text-muted-foreground/80">
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
          <p className="mt-4 text-xs text-muted-foreground">
            Note: saves and exports require sign-in. Fireball events are not savable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
