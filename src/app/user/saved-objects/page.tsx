import { Metadata } from "next";
import { SavedObjectsPageContent } from "./saved-objects-page-content";
import { getAuthUser } from "@/lib/auth";
import { resolveProAccess } from "@/lib/pro-access";

export const metadata: Metadata = {
  title: "Saved Objects",
  description: "Your saved cosmic objects and events",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SavedObjectsPage() {
  const proAccess = resolveProAccess(await getAuthUser());
  return <SavedObjectsPageContent canAccessCollections={proAccess.canAccessCollections} />;
}
