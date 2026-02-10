"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border border-border bg-background accent-primary transition-colors focus-visible:border-brass-light/30 focus-visible:ring-brass-light/25 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Checkbox };
