"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProBadge } from "@/components/pro-badge";
import { Check, Loader2, ExternalLink, Sparkles, Database, Download, Bell, FolderHeart } from "lucide-react";

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
}

const PRO_FEATURES = [
  { icon: FolderHeart, label: "Unlimited saved objects & collections" },
  { icon: Database, label: "Save custom searches" },
  { icon: Download, label: "Export data to CSV/JSON" },
  { icon: Bell, label: "Custom alerts for cosmic events" },
];

export function BillingContent({ tier, hasStripeCustomer }: BillingContentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

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
            Your subscription is now active. Enjoy all the premium features!
          </p>
        </div>
      )}

      {canceled && (
        <div className="p-4 rounded-lg border border-muted-foreground/50 bg-muted/50 text-muted-foreground">
          <p className="text-sm">
            Checkout was canceled. You can upgrade anytime when you&apos;re ready.
          </p>
        </div>
      )}

      {/* Current Plan Card */}
      <Card>
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
              {hasStripeCustomer && (
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
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="gap-2 bg-uranium-green hover:bg-uranium-green/90 text-background"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pro Features Card */}
      <Card>
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
    </div>
  );
}
