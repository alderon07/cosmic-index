import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-xs font-medium backdrop-blur-sm transition-[color,box-shadow,border-color,background-color] [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:border-brass-light/30 focus-visible:ring-brass-light/25 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/85",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/85",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/85 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border/65 bg-card/55 text-foreground/90 [a&]:hover:border-brass-light/25 [a&]:hover:bg-panel-bronze/60 [a&]:hover:text-brass-light",
        ghost:
          "text-muted-foreground [a&]:hover:bg-panel-bronze/60 [a&]:hover:text-brass-light",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
