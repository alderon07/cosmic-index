import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Waitlist Retired",
  description:
    "The public Cosmic Index waitlist has been retired. Sign in to manage billing and subscription access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WaitlistPage() {
  return (
    <div className="shell-container max-w-2xl py-12">
      <h1 className="font-display text-3xl tracking-wide text-orange-100">
        Waitlist Retired
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        The public waitlist is no longer active. If you already have an account,
        open billing to review subscription access.
      </p>
      <p className="mt-4 text-sm">
        <Link href="/settings/billing" className="text-primary hover:underline">
          Open Billing
        </Link>
      </p>
    </div>
  );
}
