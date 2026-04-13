"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";

interface LearnBlockProps {
  title: string;
  explanation: string;
  impact?: string;
  scale?: Array<{ label: string; description: string }>;
  defaultOpen?: boolean;
}

export function LearnBlock({
  title,
  explanation,
  impact,
  scale,
  defaultOpen = false,
}: LearnBlockProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? "learn" : undefined}
    >
      <AccordionItem
        value="learn"
        className="rounded-xl border border-aurora-violet/20 bg-aurora-violet/[0.04] px-4"
      >
        <AccordionTrigger className="gap-2 py-3 text-sm font-medium text-aurora-violet hover:no-underline [&>svg]:text-aurora-violet/70">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0" />
            {title}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{explanation}</p>
            {impact ? (
              <div className="rounded-lg border border-aurora-violet/15 bg-aurora-violet/[0.03] px-3 py-2.5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-aurora-violet/80">
                  Why it matters
                </p>
                <p>{impact}</p>
              </div>
            ) : null}
            {scale && scale.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-aurora-violet/80">
                  Scale reference
                </p>
                <div className="grid gap-1.5">
                  {scale.map((level) => (
                    <div
                      key={level.label}
                      className="flex gap-3 rounded-lg border border-border/30 bg-black/10 px-3 py-2 text-xs"
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
