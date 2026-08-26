"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { NoAdsMarker } from "@/components/ads/no-ads-marker";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="shell-container py-16">
      <NoAdsMarker />
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-red-300/20 bg-red-400/10">
          <AlertTriangle className="h-8 w-8 text-red-300" aria-hidden="true" />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-red-300/70">
          Instrument fault
        </p>
        <h1 className="mt-3 font-display text-3xl text-orange-50">
          Something went wrong
        </h1>
        <p className="mt-4 text-orange-100/65">
          This view could not be loaded. No advertisement is requested on this
          error screen.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-lg bg-orange-500 px-6 py-3 font-medium text-[#160d08] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
