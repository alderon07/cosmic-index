import type { Metadata } from "next";
import { ObservatoryShell } from "@/components/observatory/observatory-shell";
import { OverviewClient } from "@/components/observatory/overview-client";
import { SignalsResponseSchema, WatchesResponseSchema } from "@/components/observatory/types";
import { requireAuth } from "@/lib/auth";
import { getObservatoryHealth } from "@/lib/observatory-health";
import { countUnreadSignals, listSignals, listWatches } from "@/lib/observatory-store";

export const metadata: Metadata = {
  title: "My Observatory",
  description: "Your personal watches and signals from across the cosmos.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ObservatoryPage() {
  const user = await requireAuth();
  const renderedAt = new Date();
  const [watches, signals, unreadCount, health] = await Promise.all([
    listWatches({ userId: user.userId, tier: user.tier, limit: 20 }),
    listSignals({ userId: user.userId, limit: 20, status: "all" }),
    countUnreadSignals(user.userId),
    getObservatoryHealth(renderedAt),
  ]);
  return <ObservatoryShell active="overview"><OverviewClient initialWatches={WatchesResponseSchema.parse(watches)} initialSignals={SignalsResponseSchema.parse(signals)} initialUnreadCount={unreadCount} renderedAt={renderedAt.toISOString()} health={health} /></ObservatoryShell>;
}
