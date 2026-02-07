import { Metadata } from "next";
import { CollectionsPageContent } from "./collections-page-content";

export const metadata: Metadata = {
  title: "Collections",
  description: "Organize your saved cosmic objects into collections",
};

export default function CollectionsPage() {
  return <CollectionsPageContent />;
}
