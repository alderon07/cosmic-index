"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { cn } from "@/lib/utils";
import type { WaitlistSource } from "@/lib/waitlist";

interface WaitlistCtaProps {
  source: WaitlistSource;
  className?: string;
  compact?: boolean;
}

export function WaitlistCta({ source, className, compact = false }: WaitlistCtaProps) {
  const auth = useAppAuth();
  const [email, setEmail] = useState(auth.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"muted" | "error" | "success">("muted");

  const buttonLabel = useMemo(() => {
    if (isSubmitting) return "Joining...";
    return "Join Waitlist";
  }, [isSubmitting]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setStatusText(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 429 && payload?.retryAfterSec) {
          setStatusTone("error");
          setStatusText(`Rate limited. Try again in ${payload.retryAfterSec}s.`);
          return;
        }

        setStatusTone("error");
        setStatusText("Could not join waitlist right now.");
        return;
      }

      if (payload?.status === "already_joined") {
        setStatusTone("success");
        setStatusText("You are already on the waitlist.");
        return;
      }

      if (payload?.status === "reactivated") {
        setStatusTone("success");
        setStatusText("You are back on the waitlist.");
        return;
      }

      setStatusTone("success");
      setStatusText("Thanks. You are on the waitlist.");
    } catch {
      setStatusTone("error");
      setStatusText("Could not join waitlist right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className={cn("space-y-2", className)}
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className={cn("flex gap-2", compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row")}>
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-w-0 flex-1"
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {buttonLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        We store your email to notify you about Pro availability. Unsubscribe anytime.
      </p>
      {statusText ? (
        <p
          className={cn("text-xs", {
            "text-muted-foreground": statusTone === "muted",
            "text-destructive": statusTone === "error",
            "text-uranium-green": statusTone === "success",
          })}
          role="status"
          aria-live="polite"
        >
          {statusText}
        </p>
      ) : null}
    </form>
  );
}
