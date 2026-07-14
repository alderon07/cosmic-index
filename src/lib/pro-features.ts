import { Database, Download, FolderHeart, Telescope, type LucideIcon } from "lucide-react";

export interface ProFeature {
  icon: LucideIcon;
  label: string;
  description: string;
}

export const PRO_FEATURES: ProFeature[] = [
  {
    icon: FolderHeart,
    label: "Higher save capacity",
    description: "Store up to 1,500 saved objects and organize them into collections for long-running projects.",
  },
  {
    icon: Database,
    label: "More saved searches",
    description: "Keep up to 400 saved searches for repeatable query workflows (free includes 100).",
  },
  {
    icon: Download,
    label: "Research exports",
    description: "Download JSON, NDJSON, and CSV exports with Pro-only per-hour and per-export limits for research workflows.",
  },
  {
    icon: Telescope,
    label: "My Observatory",
    description: "Run up to 50 Watches and keep 180 days of private Signal history. Free includes one Watch and 30 days.",
  },
];
