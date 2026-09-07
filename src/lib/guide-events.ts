import { getGuide } from "@/content/guide-index";

const EVENTS = ["guide_save", "guide_remove", "guide_tool_open", "guide_calculator_change"] as const;

// Send only a fixed action and a published content identifier. Never read search
// strings, form values, account details, or the visitor's saved reading list.
export function getGuideEngagementEvent(action: string | undefined, slug: string | undefined) {
  const name = EVENTS.find((event) => event === action);
  const guide = slug ? getGuide(slug) : undefined;
  return name && guide ? { name, guide: guide.slug } : null;
}
