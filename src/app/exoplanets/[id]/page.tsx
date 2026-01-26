import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ObjectDetail } from "@/components/object-detail";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { fetchExoplanetBySlug } from "@/lib/nasa-exoplanet";
import { ExoplanetData } from "@/lib/types";

const BASE_URL = "https://cosmic-index.vercel.app";

interface ExoplanetDetailPageProps {
  params: Promise<{ id: string }>;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: ExoplanetDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const exoplanet = await fetchExoplanetBySlug(id);

  if (!exoplanet) {
    return {
      title: "Exoplanet Not Found",
      description: "The requested exoplanet could not be found.",
    };
  }

  const title = exoplanet.displayName;
  const description = exoplanet.summary.slice(0, 155);

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Cosmic Index`,
      description,
      url: `${BASE_URL}/exoplanets/${id}`,
      type: "article",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${exoplanet.displayName} - Exoplanet`,
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
      canonical: `${BASE_URL}/exoplanets/${id}`,
    },
  };
}

// Generate JSON-LD structured data for an exoplanet
// Data comes from trusted NASA API, JSON.stringify safely escapes special characters
function generateExoplanetJsonLd(exoplanet: ExoplanetData, slug: string) {
  const additionalProperties = [];

  if (exoplanet.hostStar) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Host Star",
      value: exoplanet.hostStar,
    });
  }

  if (exoplanet.discoveryMethod) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Discovery Method",
      value: exoplanet.discoveryMethod,
    });
  }

  if (exoplanet.radiusEarth !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Radius",
      value: exoplanet.radiusEarth.toFixed(2),
      unitText: "Earth radii",
    });
  }

  if (exoplanet.massEarth !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Mass",
      value: exoplanet.massEarth.toFixed(2),
      unitText: "Earth masses",
    });
  }

  if (exoplanet.orbitalPeriodDays !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Orbital Period",
      value: exoplanet.orbitalPeriodDays.toFixed(2),
      unitText: "days",
    });
  }

  if (exoplanet.distanceParsecs !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Distance",
      value: exoplanet.distanceParsecs.toFixed(1),
      unitText: "parsecs",
    });
  }

  if (exoplanet.discoveredYear !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Discovery Year",
      value: exoplanet.discoveredYear.toString(),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    name: exoplanet.displayName,
    description: exoplanet.summary,
    url: `${BASE_URL}/exoplanets/${slug}`,
    additionalType: "https://schema.org/Thing",
    additionalProperty: additionalProperties,
    sameAs: [
      `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(exoplanet.sourceId)}`,
    ],
  };
}

export default async function ExoplanetDetailPage({
  params,
}: ExoplanetDetailPageProps) {
  const { id } = await params;
  const exoplanet = await fetchExoplanetBySlug(id);

  if (!exoplanet) {
    notFound();
  }

  const jsonLd = generateExoplanetJsonLd(exoplanet, id);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Exoplanets", href: "/exoplanets" },
    { label: exoplanet.displayName },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        <ObjectDetail object={exoplanet} />
      </div>
    </>
  );
}
