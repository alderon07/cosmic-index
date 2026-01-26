import { CircleDot } from "lucide-react";
import Link from "next/link";

export default function SmallBodyNotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
          <CircleDot className="w-8 h-8 text-secondary" />
        </div>
        <h1 className="font-display text-3xl text-foreground mb-4">
          Small Body Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The asteroid or comet you&apos;re looking for doesn&apos;t exist in
          our database. It may have been removed or the URL might be incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/small-bodies"
            className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Browse Small Bodies
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
