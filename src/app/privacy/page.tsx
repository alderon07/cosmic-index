import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";

const GITHUB_REPOSITORY = "https://github.com/alderon07/cosmic-index";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Cosmic Index handles account, billing, saved-feature, analytics, advertising, and consent data.",
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
  openGraph: {
    title: "Privacy Policy | Cosmic Index",
    description:
      "How Cosmic Index handles account, billing, analytics, advertising, and consent data.",
    url: `${BASE_URL}/privacy`,
  },
};

const sectionClassName =
  "rounded-lg border border-orange-200/15 bg-[#17100c]/80 p-5 sm:p-6";
const linkClassName =
  "text-orange-300 underline decoration-orange-300/40 underline-offset-4 hover:text-amber-200";

export default function PrivacyPage() {
  return (
    <article className="shell-container max-w-4xl py-12 sm:py-16">
      <header className="mb-8 border-b border-orange-200/15 pb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-orange-300/80">
          Help &amp; trust
        </p>
        <h1 className="font-display text-3xl text-orange-50 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-orange-100/60">
          Last updated: September 6, 2026
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-orange-100/75">
          Cosmic Index is a general-audience astronomy service. This policy
          explains the information used to operate accounts, subscriptions,
          saved features, site analytics, and advertising.
        </p>
      </header>

      <div className="space-y-5 text-sm leading-7 text-orange-100/75 sm:text-base">
        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">Accounts and billing</h2>
          <p className="mt-3">
            Clerk handles account authentication, browser sessions, and related
            account identifiers. Stripe hosts checkout and billing-management
            screens and provides subscription and payment status to Cosmic Index.
            Cosmic Index does not store full payment-card details.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">Application data</h2>
          <p className="mt-3">
            Turso stores account records, subscription state, and data created by
            signed-in features such as saved objects, collections, searches, and
            observatory alerts. Upstash is used for bounded caching and rate
            limiting. Operational records may include timestamps and technical
            request information needed for reliability, abuse prevention, and
            security.
          </p>
          <p className="mt-3">The optional field-guide reading list stores only saved guide identifiers in this browser. It does not sync to your account or other devices. Remove a guide with its save button, or clear site data in your browser to delete the list.</p>
        </section>

        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">Analytics</h2>
          <p className="mt-3">
            Vercel Analytics and Google Analytics help measure aggregate site use
            and diagnose performance. Depending on your region and consent
            choices, these services may process device, browser, approximate
            location, page-view, referrer, and IP-derived information. This
            privacy-policy document does not load those telemetry scripts.
          </p>
          <p className="mt-3">Guide engagement events count save-button clicks, calculator changes, and links opened from a guide into the catalog. These events include the published guide identifier, not calculator inputs, the contents of your reading list, or account details.</p>
        </section>

        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">
            Error monitoring and bug reports
          </h2>
          <p className="mt-3">
            Sentry receives sampled performance information and technical error
            details such as the affected page, stack trace, browser, device, and
            IP-derived information. Default personally identifiable information,
            request bodies, and authenticated user details are not sent. The
            optional bug-report form sends the description and email address you
            choose to provide; screenshots are disabled. Sentry monitoring and
            the bug-report form are disabled on this privacy-policy document.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">Advertising</h2>
          <p className="mt-3">
            Free visitors may see a Google AdSense display advertisement below
            the site footer. Google and participating vendors may use cookies or
            similar storage and process IP addresses, device identifiers,
            browser information, and page context to deliver, limit, secure, and
            measure personalized or non-personalized ads. Paid subscribers do not
            receive an ad unit or ad request while their entitlement is confirmed.
          </p>
          <p className="mt-3">
            Learn how Google uses information from sites and apps that use its
            services in Google&apos;s{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              className={linkClassName}
            >
              partner-data explanation
            </a>
            , or manage advertising preferences in{" "}
            <a href="https://adssettings.google.com/" className={linkClassName}>
              Google Ads Settings
            </a>
            .
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">
            Consent and US-state choices
          </h2>
          <p className="mt-3">
            Where required, Google&apos;s privacy message presents consent,
            non-consent, vendor, and purpose choices. You can revisit the privacy
            choices control provided on supported pages to withdraw consent. US
            residents can also use the displayed state privacy control to opt out
            of applicable sale, sharing, or targeted-advertising processing.
            Browser settings can clear previously stored cookies.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">Children</h2>
          <p className="mt-3">
            Cosmic Index is a general-audience service and is not directed to
            children under 13. Please do not submit a child&apos;s personal
            information through the service or its public support channels.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className="font-display text-xl text-orange-100">Contact</h2>
          <p className="mt-3">
            For privacy questions, open an issue in the{" "}
            <a href={GITHUB_REPOSITORY} className={linkClassName}>
              Cosmic Index GitHub repository
            </a>
            . GitHub issues are public: do not include personal information,
            account details, billing records, or secrets in an issue.
          </p>
        </section>
      </div>

      <nav aria-label="Leave privacy policy" className="mt-8">
        {/* A document navigation prevents telemetry scripts from persisting across this boundary. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={linkClassName}>
          Return to Cosmic Index
        </a>
      </nav>
    </article>
  );
}
