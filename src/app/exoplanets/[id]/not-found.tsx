import { Circle } from "lucide-react";
import Link from "next/link";

export default function ExoplanetNotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Circle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl text-foreground mb-4">
          Exoplanet Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The exoplanet you&apos;re looking for doesn&apos;t exist in our
          database. It may have been removed or the URL might be incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/exoplanets"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Exoplanets
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
