import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WaitlistCta } from "@/components/waitlist/waitlist-cta";
import { getWaitlistEnabled } from "@/lib/runtime-mode";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Pro Waitlist",
  description: "Join the Cosmic Index Pro waitlist.",
};

export default function WaitlistPage() {
  const waitlistEnabled = getWaitlistEnabled();

  return (
    <div className="shell-container py-10">
      <Card tone={ACCOUNT_CARD_TONE} className="mx-auto max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-300/30 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-orange-100/80">
            <span className="h-2 w-2 rounded-full bg-uranium-green" />
            Pro Waitlist
          </div>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-uranium-green" />
            Get Notified When Pro Opens
          </CardTitle>
          <CardDescription>
            Join the waitlist to hear about Pro billing availability and rollout updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {waitlistEnabled ? (
            <WaitlistCta source="pro_badge" />
          ) : (
            <div className="space-y-3 rounded-md border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                The waitlist is currently disabled for this environment.
              </p>
            </div>
          )}

          <div className="rounded-md border border-border/60 bg-muted/15 p-3 text-sm text-muted-foreground">
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
