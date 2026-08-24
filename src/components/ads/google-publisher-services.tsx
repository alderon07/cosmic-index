"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useQuery } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import type { AdsenseConfig } from "@/lib/adsense";
import {
  isAdEligiblePath,
  NO_ADS_MARKER_SELECTOR,
} from "@/lib/adsense";
import { queryKeys } from "@/lib/query-keys";

const adEligibilityResponseSchema = z
  .object({
    canShowAds: z.boolean(),
  })
  .strict();

const initializedAdElements = new WeakSet<HTMLElement>();

export interface AdEligibilityResponse {
  canShowAds: boolean;
}

interface FooterAdVisibilityState {
  servingEnabled: boolean;
  routeEligible: boolean;
  hasNoAdsMarker: boolean;
  authLoaded: boolean;
  isSignedIn: boolean;
  eligibilityResolved: boolean;
  eligibilityFetching: boolean;
  canShowAds: boolean;
  publisherScriptReady: boolean;
}

interface GooglePublisherServicesProps {
  adsense: AdsenseConfig;
  googleAnalyticsId: string | null;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function shouldRenderSiteTelemetry(pathname: string): boolean {
  return pathname !== "/privacy" && !pathname.startsWith("/privacy/");
}

export function getFooterAdVisibility({
  servingEnabled,
  routeEligible,
  hasNoAdsMarker,
  authLoaded,
  isSignedIn,
  eligibilityResolved,
  eligibilityFetching,
  canShowAds,
  publisherScriptReady,
}: FooterAdVisibilityState): boolean {
  if (
    !servingEnabled ||
    !routeEligible ||
    hasNoAdsMarker ||
    !authLoaded ||
    !publisherScriptReady
  ) {
    return false;
  }

  if (!isSignedIn) return true;

  return eligibilityResolved && !eligibilityFetching && canShowAds;
}

function subscribeToDocumentChanges(onStoreChange: () => void): () => void {
  if (typeof document === "undefined" || !document.body) return () => undefined;

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function getNoAdsMarkerSnapshot(): boolean {
  if (typeof document === "undefined") return true;
  return document.querySelector(NO_ADS_MARKER_SELECTOR) !== null;
}

function useHasNoAdsMarker(): boolean {
  return useSyncExternalStore(
    subscribeToDocumentChanges,
    getNoAdsMarkerSnapshot,
    () => true
  );
}

export function initializeAdsenseElement(
  adElement: HTMLElement,
  enqueue: () => void = () => {
    (window.adsbygoogle ??= []).push({});
  }
): boolean {
  if (
    initializedAdElements.has(adElement) ||
    !adElement.isConnected ||
    adElement.getBoundingClientRect().width <= 0
  ) {
    return false;
  }

  initializedAdElements.add(adElement);
  adElement.dataset.adsbygoogleInitialized = "true";

  try {
    enqueue();
  } catch {
    // Blocked scripts and unfilled inventory should not affect the application.
  }

  return true;
}

async function fetchAdEligibility(): Promise<AdEligibilityResponse> {
  const response = await fetch("/api/user/ad-eligibility", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Ad eligibility unavailable");
  }

  return adEligibilityResponseSchema.parse(await response.json());
}

export function FooterAdUnit({
  clientId,
  slotId,
}: {
  clientId: string;
  slotId: string;
}) {
  const adElementRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const adElement = adElementRef.current;
    if (!adElement || initializedAdElements.has(adElement)) return;

    let intersectionObserver: IntersectionObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const initialize = () => {
      if (initializeAdsenseElement(adElement)) {
        intersectionObserver?.disconnect();
        resizeObserver?.disconnect();
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      initialize();
    } else {
      intersectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) initialize();
      });
      intersectionObserver.observe(adElement);
    }

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(initialize);
      resizeObserver.observe(adElement);
    }

    return () => {
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <aside
      aria-label="Advertisements"
      className="border-t border-orange-200/10 bg-[#0d0907] px-4 py-5 sm:py-6"
    >
      <div className="mx-auto w-full max-w-[970px] text-center">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-orange-100/45">
          Advertisements
        </h2>
        <ins
          ref={adElementRef}
          className="adsbygoogle block w-full overflow-hidden"
          style={{ display: "block" }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}

export function GooglePublisherServices({
  adsense,
  googleAnalyticsId,
}: GooglePublisherServicesProps) {
  const pathname = usePathname();
  const auth = useAppAuth();
  const hasNoAdsMarker = useHasNoAdsMarker();
  const [publisherScriptReady, setPublisherScriptReady] = useState(false);
  const routeEligible = isAdEligiblePath(pathname);
  const telemetryAllowed = shouldRenderSiteTelemetry(pathname);

  const eligibility = useQuery({
    queryKey: queryKeys.adsenseEligibility(auth.userId ?? "unknown"),
    queryFn: fetchAdEligibility,
    enabled:
      adsense.enabled &&
      routeEligible &&
      !hasNoAdsMarker &&
      auth.isLoaded &&
      auth.isSignedIn &&
      Boolean(auth.userId),
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const showAd = getFooterAdVisibility({
    servingEnabled: adsense.enabled,
    routeEligible,
    hasNoAdsMarker,
    authLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    eligibilityResolved: eligibility.isSuccess,
    eligibilityFetching: eligibility.isFetching,
    canShowAds: eligibility.data?.canShowAds === true,
    publisherScriptReady,
  });

  if (!telemetryAllowed) return null;

  const analyticsReady = !adsense.enabled || publisherScriptReady;

  return (
    <>
      {adsense.enabled && adsense.clientId ? (
        <Script
          id="google-publisher-services"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsense.clientId)}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
          onLoad={() => setPublisherScriptReady(true)}
          onReady={() => setPublisherScriptReady(true)}
        />
      ) : null}

      {showAd && adsense.clientId && adsense.footerSlotId ? (
        <FooterAdUnit
          clientId={adsense.clientId}
          slotId={adsense.footerSlotId}
        />
      ) : null}

      <Analytics />
      {analyticsReady && googleAnalyticsId ? (
        <GoogleAnalytics gaId={googleAnalyticsId} />
      ) : null}
    </>
  );
}
