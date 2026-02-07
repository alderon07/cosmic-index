import { APODData } from "@/lib/types";
import { fetchAPOD } from "@/lib/nasa-apod";
import { APODCard } from "./apod-card";

export async function APODCardServer() {
  let initialApod: APODData | null = null;
  let initialError: string | null = null;

  try {
    initialApod = await fetchAPOD();
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Failed to load";
  }

  return <APODCard initialApod={initialApod} initialError={initialError} />;
}
