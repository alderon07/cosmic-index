"use client";

import { useState, useEffect, use } from "react";
import { ObjectDetail, ObjectDetailSkeleton } from "@/components/object-detail";
import { SmallBodyData } from "@/lib/types";

interface SmallBodyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SmallBodyDetailPage({ params }: SmallBodyDetailPageProps) {
  const { id } = use(params);
  const [data, setData] = useState<SmallBodyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/small-bodies/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Small body not found");
          }
          throw new Error("Failed to fetch small body");
        }

        const result: SmallBodyData = await response.json();
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
            {error === "Small body not found" ? "Small Body Not Found" : "Error"}
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a
            href="/small-bodies"
            className="text-primary hover:underline"
          >
            Back to Small Bodies
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
