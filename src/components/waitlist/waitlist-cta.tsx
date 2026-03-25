"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { cn } from "@/lib/utils";
import type { WaitlistSource } from "@/lib/waitlist";

interface WaitlistCtaProps {
  source: WaitlistSource;
  className?: string;
  compact?: boolean;
  initialJoined?: boolean;
}

export function WaitlistCta({ source, className, compact = false, initialJoined = false }: WaitlistCtaProps) {
  const auth = useAppAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasJoined, setHasJoined] = useState(initialJoined);
  const [statusText, setStatusText] = useState<string | null>(
    initialJoined ? "You are already on the waitlist." : null
  );
  const [statusTone, setStatusTone] = useState<"muted" | "error" | "success">(
    initialJoined ? "success" : "muted"
  );

  const buttonLabel = useMemo(() => {
    if (isSubmitting) return "Joining...";
    if (hasJoined) return "Already on Waitlist";
    return "Join Waitlist";
  }, [isSubmitting, hasJoined]);
  const accountEmail = auth.email.trim();
  const hasAccountEmail = accountEmail.length > 0;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setStatusText(null);
    setIsSubmitting(true);

    try {
      const body: { source: WaitlistSource; email?: string } = { source };
      if (hasAccountEmail) {
        body.email = accountEmail;
      }

      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          setStatusTone("error");
          setStatusText("Sign in to join the waitlist.");
          return;
        }

        if (response.status === 429 && payload?.retryAfterSec) {
          setStatusTone("error");
          setStatusText(`Rate limited. Try again in ${payload.retryAfterSec}s.`);
          return;
        }

        if (response.status === 403 && payload?.error === "email_mismatch") {
          setStatusTone("error");
          setStatusText("Waitlist joins must use your signed-in account email.");
          return;
        }

        if (response.status === 400 && payload?.error === "account_email_unavailable") {
          setStatusTone("error");
          setStatusText("Your account email is unavailable. Update your profile email and try again.");
          return;
        }

        setStatusTone("error");
        setStatusText("Could not join waitlist right now.");
        return;
      }

      if (payload?.status === "already_joined") {
        setHasJoined(true);
        setStatusTone("success");
        setStatusText("You are already on the waitlist.");
        return;
      }

      if (payload?.status === "reactivated") {
        setHasJoined(true);
        setStatusTone("success");
        setStatusText("You are back on the waitlist.");
        return;
      }

      setHasJoined(true);
      setStatusTone("success");
      setStatusText("Thanks. You are on the waitlist.");
    } catch {
      setStatusTone("error");
      setStatusText("Could not join waitlist right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!auth.isSignedIn) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-sm text-muted-foreground">Sign in to join the Pro waitlist.</p>
        {auth.mode === "clerk" ? (
          <SignInButton mode="modal">
            <Button type="button">Sign In to Join</Button>
          </SignInButton>
        ) : (
          <Button type="button" disabled>
            Sign In to Join
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className={cn("space-y-2", className)}
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className={cn("min-w-0 flex-1 rounded-md border border-border/70 bg-muted/15", {
            "px-3 py-2": !compact,
            "px-2.5 py-2": compact,
          })}
        >
          <p
            className={cn("uppercase tracking-[0.16em] text-muted-foreground/85", {
              "text-[10px]": !compact,
              "text-[9px]": compact,
            })}
          >
            Waitlist Email
          </p>
          <p
            className={cn("truncate text-sm", {
              "text-foreground": hasAccountEmail,
              "text-muted-foreground": !hasAccountEmail,
              "text-xs": compact,
            })}
          >
            {hasAccountEmail
              ? accountEmail
              : "Your signed-in account email will be used automatically."}
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting || hasJoined}>
          {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {buttonLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        We use your signed-in account email to notify you about Pro availability. Unsubscribe anytime.
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
