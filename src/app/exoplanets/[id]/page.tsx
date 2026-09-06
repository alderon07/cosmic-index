import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { ExoplanetInterpretation } from "@/components/exoplanet-interpretation";
import { ObjectDetail } from "@/components/object-detail";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BASE_URL } from "@/lib/config";
import { THEMES } from "@/lib/theme";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import {
  loadExoplanetDetail,
  loadExoplanetSystemContext,
} from "@/lib/exoplanet-detail-data";
import {
  buildExoplanetJsonLd,
  buildExoplanetMetaDescription,
} from "@/lib/exoplanet-detail";
import { ExoplanetSystemContext } from "./exoplanet-system-context";

interface ExoplanetDetailPageProps {
  params: Promise<{ id: string }>;
}

// Generate catalog pages on first request, then reuse them across crawler and
// visitor traffic. Exoplanet catalog data changes slowly enough for a 14-day
// refresh window, while failed revalidations continue serving the last page.
export const dynamic = "force-static";
export const revalidate = 1209600;

export function generateStaticParams(): Array<{ id: string }> {
  return [];
}

const getExoplanetById = cache(loadExoplanetDetail);
const getSystemContext = cache(loadExoplanetSystemContext);

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: ExoplanetDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const exoplanet = await getExoplanetById(id);

  if (!exoplanet) {
    return {
      title: "Exoplanet Not Found",
      description: "The requested exoplanet could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = exoplanet.displayName;
  const description = buildExoplanetMetaDescription(exoplanet);

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

export default async function ExoplanetDetailPage({
  params,
}: ExoplanetDetailPageProps) {
  const { id } = await params;
  const exoplanet = await getExoplanetById(id);

  if (!exoplanet) {
    notFound();
  }

  const jsonLd = buildExoplanetJsonLd(exoplanet, id);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Exoplanets", href: "/exoplanets" },
    { label: exoplanet.displayName },
  ];

  const hasHostStar = Boolean(exoplanet.hostStar && exoplanet.hostStar !== "Unknown");
  const { hostStar, systemPlanets } = hasHostStar
    ? await getSystemContext(exoplanet.hostStar)
    : { hostStar: null, systemPlanets: [] };

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbItems)} />
      <div className="shell-container py-8">
        <Breadcrumbs
          items={breadcrumbItems}
          className="mb-6"
          linkHoverClassName={THEMES.exoplanets.hoverText}
        />
        <ObjectDetail
          object={exoplanet}
          measurementContext={<ExoplanetInterpretation exoplanet={exoplanet} />}
        />
        <div className="mt-8">
          <ExoplanetSystemContext
            exoplanet={exoplanet}
            hostStar={hostStar}
            systemPlanets={systemPlanets}
          />
        </div>
      </div>
    </>
  );
}
