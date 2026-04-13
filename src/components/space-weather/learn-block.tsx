"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";
import { THEMES, type ObjectTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type LearnBlockVariant = "card" | "inline";

interface LearnBlockProps {
  title: string;
  explanation: string;
  impact?: string;
  scale?: Array<{ label: string; description: string }>;
  defaultOpen?: boolean;
  variant?: LearnBlockVariant;
  theme?: ObjectTheme;
}

export function LearnBlock({
  title,
  explanation,
  impact,
  scale,
  defaultOpen = false,
  variant = "card",
  theme = "space-weather",
}: LearnBlockProps) {
  const themeConfig = THEMES[theme];
  const classes = {
    item:
      variant === "card"
        ? themeConfig.learnBlockCardItem
        : themeConfig.learnBlockInlineItem,
    trigger: cn("gap-2 py-3 text-sm font-medium", themeConfig.learnBlockTrigger),
    content: variant === "card" ? "pb-4" : "pb-1",
    body:
      variant === "card"
        ? "space-y-3 text-sm leading-relaxed text-muted-foreground"
        : "space-y-3 text-sm leading-relaxed text-muted-foreground/90",
    impact: cn("border-t pt-3", themeConfig.learnBlockDivider),
    scaleItem:
      variant === "card"
        ? "flex gap-3 rounded-lg border border-border/30 bg-black/10 px-3 py-2 text-xs"
        : "flex gap-3 rounded-xl border border-border/25 bg-black/10 px-3 py-2 text-xs",
  };

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? "learn" : undefined}
    >
      <AccordionItem
        value="learn"
        data-variant={variant}
        data-theme={theme}
        className={classes.item}
      >
        <AccordionTrigger className={classes.trigger}>
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0" />
            {title}
          </span>
        </AccordionTrigger>
        <AccordionContent className={classes.content}>
          <div className={classes.body}>
            <p>{explanation}</p>
            {impact ? (
              <div className={classes.impact}>
                <p className={cn("mb-1 text-xs font-medium uppercase tracking-wider", themeConfig.learnBlockSectionLabel)}>
                  Why it matters
                </p>
                <p>{impact}</p>
              </div>
            ) : null}
            {scale && scale.length > 0 ? (
              <div className="space-y-1.5">
                <p className={cn("text-xs font-medium uppercase tracking-wider", themeConfig.learnBlockSectionLabel)}>
                  Scale reference
                </p>
                <div className="grid gap-1.5">
                  {scale.map((level) => (
                    <div
                      key={level.label}
                      className={cn(classes.scaleItem)}
                    >
                      <span className="shrink-0 font-mono font-medium text-foreground">
                        {level.label}
                      </span>
                      <span className="text-muted-foreground/80">
                        {level.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
