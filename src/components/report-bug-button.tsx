"use client";

import * as Sentry from "@sentry/nextjs";
import { Bug } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ReportBugButton() {
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    const feedback = Sentry.getFeedback();

    if (!button || !feedback || pathname === "/privacy") {
      return;
    }

    return feedback.attachTo(button);
  }, [pathname]);

  if (pathname === "/privacy") {
    return null;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="group inline-flex items-center gap-1.5 text-orange-300 transition-colors hover:text-amber-200 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
    >
      <Bug className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Report a bug</span>
    </button>
  );
}
