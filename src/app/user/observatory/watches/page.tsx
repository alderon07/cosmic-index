import type { Metadata } from "next";
import { ObservatoryShell } from "@/components/observatory/observatory-shell";
import { WatchesClient } from "@/components/observatory/watches-client";
import { WatchesResponseSchema } from "@/components/observatory/types";
import { requireAuth } from "@/lib/auth";
import { listWatches } from "@/lib/observatory-store";

export const metadata: Metadata = {
  title: "Watches | My Observatory",
  description: "Choose what Cosmic Index should watch for you.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ObservatoryWatchesPage() {
  const user = await requireAuth();
  const watches = await listWatches({ userId: user.userId, tier: user.tier, limit: 20 });
  return <ObservatoryShell active="watches"><WatchesClient initialData={WatchesResponseSchema.parse(watches)} /></ObservatoryShell>;
}
