import { Metadata } from "next";
import { SavedObjectsPageContent } from "./saved-objects-page-content";

export const metadata: Metadata = {
  title: "Saved Objects",
  description: "Your saved cosmic objects and events",
};

export default function SavedObjectsPage() {
  return <SavedObjectsPageContent />;
}
