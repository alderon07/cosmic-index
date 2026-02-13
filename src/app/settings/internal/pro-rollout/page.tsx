import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth";
import { isInternalAdmin, isInternalAdminConfigured } from "@/lib/admin-access";
import { resolveLimitMode } from "@/lib/feature-policy";
import { getUserDb } from "@/lib/user-db";
import {
  getActiveWaitlistCount,
  getInterestForDay,
  getInterestForLastDays,
  getUtcDayKey,
} from "@/lib/waitlist";

export const metadata: Metadata = {
  title: "Pro Rollout Status",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export default async function ProRolloutStatusPage() {
  if (!isInternalAdminConfigured()) {
    notFound();
  }

  const user = await getAuthUser();
  if (!user || !isInternalAdmin(user.userId)) {
    notFound();
  }

  const db = getUserDb();
  if (!db) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-2xl tracking-wide">Pro Rollout Status</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Status unavailable because Turso is not configured.
        </p>
      </div>
    );
  }

  const waitlistCount = await getActiveWaitlistCount(db);
  const mode = await resolveLimitMode({
    db,
    waitlistCountOverride: waitlistCount,
  });
  const [today, last7d] = await Promise.all([
    getInterestForDay(db, getUtcDayKey()),
    getInterestForLastDays(db, 7),
  ]);

  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-4 py-8">
      <h1 className="font-display text-2xl tracking-wide">Pro Rollout Status</h1>

      <Card>
        <CardHeader>
          <CardTitle>Waitlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Active Signups</span>
            <span>{formatNumber(waitlistCount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Threshold</span>
            <span>{formatNumber(mode.threshold)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Reached</span>
            <span>{mode.reached ? "Yes" : "No"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limit Modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Configured</span>
            <span>{mode.configuredMode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Effective</span>
            <span>{mode.effectiveMode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Reason</span>
            <span>{mode.reason}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interest Today (UTC)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Waitlist Signups</span>
            <span>{formatNumber(today.waitlistSignups)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saved Objects Limit Hits</span>
            <span>{formatNumber(today.savedObjectsLimitHits)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saved Searches Limit Hits</span>
            <span>{formatNumber(today.savedSearchesLimitHits)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Export Limit Hits</span>
            <span>{formatNumber(today.exportsLimitHits)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interest Last 7 Days (UTC)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Waitlist Signups</span>
            <span>{formatNumber(last7d.waitlistSignups)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saved Objects Limit Hits</span>
            <span>{formatNumber(last7d.savedObjectsLimitHits)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saved Searches Limit Hits</span>
            <span>{formatNumber(last7d.savedSearchesLimitHits)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Export Limit Hits</span>
            <span>{formatNumber(last7d.exportsLimitHits)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
