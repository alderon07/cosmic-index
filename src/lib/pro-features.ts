import { Bell, Database, Download, FolderHeart, type LucideIcon } from "lucide-react";

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
    label: "Higher export throughput",
    description: "Run larger JSON/CSV exports with higher per-hour and per-export limits for research workflows.",
  },
  {
    icon: Bell,
    label: "Custom event alerts",
    description: "Get notified about new activity relevant to your tracked objects and interests.",
  },
];
