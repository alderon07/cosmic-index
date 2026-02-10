"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProBadge } from "@/components/pro-badge";
import { WaitlistCta } from "@/components/waitlist/waitlist-cta";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";
import { Check, Loader2, ExternalLink, Sparkles, Database, Download, Bell, FolderHeart } from "lucide-react";
import { TIER_LIMITS } from "@/lib/tier-limits";

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

const PRO_FEATURES = [
  { icon: FolderHeart, label: "Unlimited saved objects & collections" },
  { icon: Database, label: "Save custom searches" },
  { icon: Download, label: "Export data to CSV/JSON" },
  { icon: Bell, label: "Custom alerts for cosmic events" },
];

const freeLimits = TIER_LIMITS.free;
const FREE_PLAN_LIMITS = [
  { label: "Saved objects", value: freeLimits.MAX_SAVED_OBJECTS.toLocaleString() },
  { label: "Saves per rolling 24h", value: freeLimits.SAVES_PER_DAY.toLocaleString() },
  { label: "Saved searches", value: freeLimits.MAX_SAVED_SEARCHES.toLocaleString() },
  { label: "Export requests / hour", value: freeLimits.EXPORT_REQUESTS_PER_HOUR.toLocaleString() },
  { label: "Export rows / hour", value: freeLimits.EXPORT_ROWS_PER_HOUR.toLocaleString() },
  { label: "Max rows per export", value: freeLimits.MAX_EXPORT_ROWS.toLocaleString() },
  { label: "CSV export max rows", value: freeLimits.CSV_MAX_ROWS.toLocaleString() },
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

      {/* Free Tier Limits Card */}
      <Card tone={ACCOUNT_CARD_TONE}>
        <CardHeader>
          <CardTitle className="text-lg">Free Plan Limits</CardTitle>
          <CardDescription>
            Current usage caps for the free tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {FREE_PLAN_LIMITS.map((limit) => (
              <li key={limit.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{limit.label}</span>
                <span className="font-medium text-foreground">{limit.value}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
