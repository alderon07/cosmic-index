import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionDetailContent } from "./collection-detail-content";

export const metadata: Metadata = {
  title: "Collection Details",
  description: "Browse and manage saved objects in your collection",
};

export default function CollectionDetailPage() {
  return (
    <Suspense fallback={<div className="shell-container py-8 text-sm text-muted-foreground">Loading collection...</div>}>
      <CollectionDetailContent />
    </Suspense>
  );
}
