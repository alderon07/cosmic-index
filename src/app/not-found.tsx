import { Telescope } from "lucide-react";
import Link from "next/link";
import { NoAdsMarker } from "@/components/ads/no-ads-marker";

export default function NotFound() {
  return (
    <div className="shell-container py-16">
      <NoAdsMarker />
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-orange-300/20 bg-orange-400/10">
          <Telescope className="h-8 w-8 text-orange-300" aria-hidden="true" />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-orange-300/70">
          Signal lost
        </p>
        <h1 className="mt-3 font-display text-3xl text-orange-50">
          Page Not Found
        </h1>
        <p className="mt-4 text-orange-100/65">
          This coordinate does not point to a page in the Cosmic Index.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-orange-500 px-6 py-3 font-medium text-[#160d08] transition-colors hover:bg-orange-400"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
