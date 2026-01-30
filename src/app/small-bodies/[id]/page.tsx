import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ObjectDetail } from "@/components/object-detail";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { fetchSmallBodyBySlug } from "@/lib/jpl-sbdb";
import { SmallBodyData } from "@/lib/types";
import { BASE_URL } from "@/lib/config";

interface SmallBodyDetailPageProps {
  params: Promise<{ id: string }>;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: SmallBodyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const smallBody = await fetchSmallBodyBySlug(id);

  if (!smallBody) {
    return {
      title: "Small Body Not Found",
      description: "The requested asteroid or comet could not be found.",
    };
  }

  const typeLabel = smallBody.bodyKind === "comet" ? "Comet" : "Asteroid";
  const title = smallBody.displayName;
  const description = smallBody.summary.slice(0, 155);

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Cosmic Index`,
      description,
      url: `${BASE_URL}/small-bodies/${id}`,
      type: "article",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${smallBody.displayName} - ${typeLabel}`,
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
      canonical: `${BASE_URL}/small-bodies/${id}`,
    },
  };
}

// Generate JSON-LD structured data for a small body
// Data comes from trusted JPL API, JSON.stringify safely escapes special characters
function generateSmallBodyJsonLd(smallBody: SmallBodyData, slug: string) {
  const additionalProperties = [];

  additionalProperties.push({
    "@type": "PropertyValue",
    name: "Body Type",
    value: smallBody.bodyKind === "comet" ? "Comet" : "Asteroid",
  });

  additionalProperties.push({
    "@type": "PropertyValue",
    name: "Orbit Class",
    value: smallBody.orbitClass,
  });

  additionalProperties.push({
    "@type": "PropertyValue",
    name: "Near-Earth Object",
    value: smallBody.isNeo ? "Yes" : "No",
  });

  additionalProperties.push({
    "@type": "PropertyValue",
    name: "Potentially Hazardous",
    value: smallBody.isPha ? "Yes" : "No",
  });

  if (smallBody.diameterKm !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Diameter",
      value: smallBody.diameterKm.toFixed(2),
      unitText: "km",
    });
  }

  if (smallBody.absoluteMagnitude !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Absolute Magnitude",
      value: smallBody.absoluteMagnitude.toFixed(1),
      unitText: "H",
    });
  }

  if (smallBody.discoveredYear !== undefined) {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Discovery Year",
      value: smallBody.discoveredYear.toString(),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    name: smallBody.displayName,
    description: smallBody.summary,
    url: `${BASE_URL}/small-bodies/${slug}`,
    additionalType: "https://schema.org/Thing",
    additionalProperty: additionalProperties,
    sameAs: [
      `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(smallBody.sourceId)}`,
    ],
  };
}

export default async function SmallBodyDetailPage({
  params,
}: SmallBodyDetailPageProps) {
  const { id } = await params;
  const smallBody = await fetchSmallBodyBySlug(id);

  if (!smallBody) {
    notFound();
  }

  const jsonLd = generateSmallBodyJsonLd(smallBody, id);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Small Bodies", href: "/small-bodies" },
    { label: smallBody.displayName },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        <ObjectDetail object={smallBody} />
      </div>
    </>
  );
}
