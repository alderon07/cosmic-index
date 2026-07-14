import { Check } from "lucide-react";
import { PRO_FEATURES } from "@/lib/pro-features";

export function ProFeaturesList({ tier }: { tier: "free" | "pro" }) {
  const isPro = tier === "pro";

  return (
    <ul className="grid gap-3">
      {PRO_FEATURES.map((feature) => (
        <li
          key={feature.label}
          className="flex items-start gap-3 rounded-lg border border-border/45 bg-black/10 p-3 sm:p-4"
        >
          <div
            className={`mt-0.5 rounded-md p-2 ${
              isPro
                ? "bg-uranium-green/20 text-uranium-green"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isPro ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <feature.icon aria-hidden="true" className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className={`font-medium ${isPro ? "text-foreground" : "text-foreground/85"}`}>
              {feature.label}
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
