"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
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

  useEffect(() => {
    if (!email && auth.email) {
      setEmail(auth.email);
    }
  }, [auth.email, email]);

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
      const accountEmail = (auth.email ?? email).trim();
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, source }),
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
      <div className={cn("flex gap-2", compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row")}>
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          readOnly
          aria-readonly
          value={auth.email ?? email}
          className="min-w-0 flex-1"
          disabled
        />
        <Button type="submit" disabled={isSubmitting}>
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
