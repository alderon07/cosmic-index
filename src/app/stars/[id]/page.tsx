import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { ObjectDetail } from "@/components/object-detail";
import { DataSources } from "@/components/data-sources";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StarPlanets } from "./star-planets";
import { getStarBySlug } from "@/lib/star-index";
import { fetchExoplanetsForHostStar } from "@/lib/nasa-exoplanet";
import { StarData } from "@/lib/types";
import { BASE_URL } from "@/lib/config";

interface StarDetailPageProps {
  params: Promise<{ id: string }>;
}

const getStarDetailById = cache(async (id: string) => getStarBySlug(id));
const getPlanetsForHostStar = cache(async (hostname: string) =>
  fetchExoplanetsForHostStar(hostname)
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

// Generate JSON-LD structured data for a star
// Data comes from trusted NASA API via our Turso database - safe to serialize
function generateStarJsonLd(star: StarData, slug: string) {
  const additionalProperties = [];

  if (star.spectralType) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Spectral Type",
      value: star.spectralType,
    });
  }

  if (star.planetCount > 0) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Known Planets",
      value: star.planetCount.toString(),
    });
  }

  if (star.distanceParsecs !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Distance",
      value: star.distanceParsecs.toFixed(1),
      unitText: "parsecs",
    });
  }

  if (star.starTempK !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Temperature",
      value: star.starTempK.toFixed(0),
      unitText: "Kelvin",
    });
  }

  if (star.starMassSolar !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Mass",
      value: star.starMassSolar.toFixed(2),
      unitText: "Solar masses",
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    additionalType: "https://schema.org/Thing",
    name: star.displayName,
    description: star.summary,
    url: `${BASE_URL}/stars/${slug}`,
    additionalProperty: additionalProperties,
    sameAs: [
      `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(
        star.hostname
      )}`,
    ],
  };
}

export default async function StarDetailPage({ params }: StarDetailPageProps) {
  const { id } = await params;
  const star = await getStarDetailById(id);

  if (!star) {
    notFound();
  }

  const jsonLd = generateStarJsonLd(star, id);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Stars", href: "/stars" },
    { label: star.displayName },
  ];

  let planetsError: string | null = null;
  let planets: Awaited<ReturnType<typeof fetchExoplanetsForHostStar>> = [];
  if (star.planetCount > 0) {
    try {
      planets = await getPlanetsForHostStar(star.hostname);
    } catch (error) {
      planetsError =
        error instanceof Error ? error.message : "Failed to load planets for this star";
    }
  }

  return (
    <>
      {/* JSON-LD for SEO - data is from trusted NASA API, JSON.stringify safely escapes special chars */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        <ObjectDetail object={star} hideDataSources />

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
