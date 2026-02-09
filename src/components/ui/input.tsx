import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-border/60 bg-card/80 px-3 py-1 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,210,160,0.05)] backdrop-blur-sm transition-[color,box-shadow,border-color,background-color] outline-none md:text-sm",
        "placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "hover:border-brass-light/20 hover:bg-panel-bronze/40 focus-visible:border-brass-light/30 focus-visible:bg-panel-bronze/55 focus-visible:ring-brass-light/20 focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
