import type { Metadata } from "next";
import { ObservatoryShell } from "@/components/observatory/observatory-shell";
import { SignalsClient } from "@/components/observatory/signals-client";
import { SignalsResponseSchema } from "@/components/observatory/types";
import { requireAuth } from "@/lib/auth";
import { countUnreadSignals, listSignals } from "@/lib/observatory-store";

export const metadata: Metadata = {
  title: "Signals | My Observatory",
  description: "See what your Cosmic Index watches have found.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ObservatorySignalsPage() {
  const user = await requireAuth();
  const [signals, unreadCount] = await Promise.all([
    listSignals({ userId: user.userId, limit: 20, status: "all" }),
    countUnreadSignals(user.userId),
  ]);
  return <ObservatoryShell active="signals"><SignalsClient initialData={SignalsResponseSchema.parse(signals)} initialUnreadCount={unreadCount} /></ObservatoryShell>;
}
