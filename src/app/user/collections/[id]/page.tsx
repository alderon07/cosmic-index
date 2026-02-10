import type { Metadata } from "next";
import { CollectionDetailContent } from "./collection-detail-content";

export const metadata: Metadata = {
  title: "Collection Details",
  description: "Browse and manage saved objects in your collection",
};

export default function CollectionDetailPage() {
  return <CollectionDetailContent />;
}
