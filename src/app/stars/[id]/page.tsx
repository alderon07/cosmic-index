import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { ObjectDetail } from "@/components/object-detail";
import { DataSources } from "@/components/data-sources";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StarPlanets } from "./star-planets";
import { getStarBySlug } from "@/lib/star-index";
import { fetchExoplanetsForHostStar } from "@/lib/nasa-exoplanet";
import { fetchStellarHostParameters } from "@/lib/nasa-stellar-host";
import { enrichStarWithStellarParameters } from "@/lib/stellar-parameters";
import { BASE_URL } from "@/lib/config";
import { THEMES } from "@/lib/theme";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { buildStarJsonLd } from "@/lib/star-seo";

interface StarDetailPageProps {
  params: Promise<{ id: string }>;
}

// Generate catalog pages on first request rather than expanding the full star
// index during every build. Published stellar data is safe to refresh monthly.
export const dynamic = "force-static";
export const revalidate = 2592000;

export function generateStaticParams(): Array<{ id: string }> {
  return [];
}

const getStarDetailById = cache(async (id: string) => getStarBySlug(id));
const getPlanetsForHostStar = cache(async (hostname: string) =>
  fetchExoplanetsForHostStar(hostname)
);
const getStellarParameters = cache(async (hostname: string) =>
  fetchStellarHostParameters(hostname)
);

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: StarDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const star = await getStarDetailById(id);

  if (!star) {
    return {
      title: "Star Not Found",
      description: "The requested star could not be found.",
    };
  }

  const title = star.displayName;
  const description = star.summary.slice(0, 155);

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Cosmic Index`,
      description,
      url: `${BASE_URL}/stars/${id}`,
      type: "article",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${star.displayName} - Star`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Cosmic Index`,
      description,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `${BASE_URL}/stars/${id}`,
    },
  };
}

export default async function StarDetailPage({ params }: StarDetailPageProps) {
  const { id } = await params;
  const star = await getStarDetailById(id);

  if (!star) {
    notFound();
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Stars", href: "/stars" },
    { label: star.displayName },
  ];

  const [parametersResult, planetsResult] = await Promise.allSettled([
    getStellarParameters(star.hostname),
    star.planetCount > 0
      ? getPlanetsForHostStar(star.hostname)
      : Promise.resolve([]),
  ]);
  const stellarParameters = parametersResult.status === "fulfilled"
    ? parametersResult.value
    : null;
  if (parametersResult.status === "rejected") {
    console.warn(
      `Stellar parameter enrichment unavailable for ${star.hostname}:`,
      parametersResult.reason,
    );
  }
  const detailedStar = enrichStarWithStellarParameters(star, stellarParameters);
  const jsonLd = buildStarJsonLd(detailedStar, id);
  const planets = planetsResult.status === "fulfilled" ? planetsResult.value : [];
  const planetsError = planetsResult.status === "rejected"
    ? planetsResult.reason instanceof Error
      ? planetsResult.reason.message
      : "Failed to load planets for this star"
    : null;

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbItems)} />
      <div className="shell-container py-8">
        <Breadcrumbs
          items={breadcrumbItems}
          className="mb-6"
          linkHoverClassName={THEMES.stars.hoverText}
        />
        <ObjectDetail object={detailedStar} hideDataSources />

        {/* Planets in this system */}
        {star.planetCount > 0 && (
          <div className="mt-8">
            <StarPlanets
              hostname={star.hostname}
              planetCount={star.planetCount}
              planets={planets}
              error={planetsError}
            />
          </div>
        )}

        {/* Data Sources at the bottom */}
        <div className="mt-8">
          <DataSources links={star.links} sourceId={star.sourceId} />
        </div>
      </div>
    </>
  );
}
