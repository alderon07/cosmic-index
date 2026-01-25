"use client";

import { useState, useEffect, use } from "react";
import { ObjectDetail, ObjectDetailSkeleton } from "@/components/object-detail";
import { ExoplanetData } from "@/lib/types";

interface ExoplanetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ExoplanetDetailPage({ params }: ExoplanetDetailPageProps) {
  const { id } = use(params);
  const [data, setData] = useState<ExoplanetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/exoplanets/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Exoplanet not found");
          }
          throw new Error("Failed to fetch exoplanet");
        }

        const result: ExoplanetData = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ObjectDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-12 text-center">
          <h2 className="font-display text-2xl text-foreground mb-2">
            {error === "Exoplanet not found" ? "Exoplanet Not Found" : "Error"}
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a
            href="/exoplanets"
            className="text-primary hover:underline"
          >
            Back to Exoplanets
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ObjectDetail object={data} />
    </div>
  );
}
