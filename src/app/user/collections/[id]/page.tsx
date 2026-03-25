import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FolderHeart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth";
import { resolveProAccess } from "@/lib/pro-access";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";
import { CollectionDetailContent } from "./collection-detail-content";

export const metadata: Metadata = {
  title: "Collection Details",
  description: "Browse and manage saved objects in your collection",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CollectionDetailPage() {
  const user = await getAuthUser();
  const proAccess = resolveProAccess(user);

  if (user && !proAccess.canAccessCollections) {
    return (
      <div className="shell-container py-12">
        <Card tone={ACCOUNT_CARD_TONE} className="max-w-3xl border-orange-300/20 bg-[#1a120d]/80">
          <CardContent className="py-10 text-center">
            <FolderHeart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-display text-xl text-orange-100">Collections are not publicly available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This collection area will open when Pro becomes available.
            </p>
            {proAccess.shouldShowWaitlist ? (
              <p className="mt-4 text-sm">
                <Link href="/waitlist" className="text-primary hover:underline">
                  Join the Pro waitlist
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="shell-container py-8 text-sm text-muted-foreground">Loading collection...</div>}>
      <CollectionDetailContent />
    </Suspense>
  );
}
