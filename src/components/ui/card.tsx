import * as React from "react"

import { DEFAULT_CARD_TONE, type CardTone } from "@/lib/theme"
import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  tone?: CardTone
}

function Card({ className, tone = DEFAULT_CARD_TONE, ...props }: CardProps) {
  const toneClass =
    tone === "neutral"
      ? "bg-card text-card-foreground border-border/50 shadow-sm"
      : "border border-border/60 py-6 text-card-foreground bezel bg-card/92 [background-image:radial-gradient(circle_at_12%_0%,rgba(255,185,120,0.12),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))] shadow-[inset_0_1px_0_rgba(255,210,160,0.08),0_10px_28px_rgba(0,0,0,0.28)] transition-[border-color,box-shadow,transform] duration-300 hover:border-reactor-orange/35 hover:shadow-[inset_0_1px_0_rgba(255,210,160,0.14),0_14px_34px_rgba(0,0,0,0.34)]"

  return (
    <div
      data-slot="card"
      className={cn(
        "relative flex flex-col gap-6 rounded-xl py-6",
        toneClass,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
