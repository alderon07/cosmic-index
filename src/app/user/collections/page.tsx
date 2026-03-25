import { Metadata } from "next";
import Link from "next/link";
import { FolderHeart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth";
import { resolveProAccess } from "@/lib/pro-access";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";
import { CollectionsPageContent } from "./collections-page-content";

export const metadata: Metadata = {
  title: "Collections",
  description: "Organize your saved cosmic objects into collections",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CollectionsPage() {
  const user = await getAuthUser();
  const proAccess = resolveProAccess(user);

  if (user && !proAccess.canAccessCollections) {
    return (
      <div className="shell-container py-12">
        <Card tone={ACCOUNT_CARD_TONE} className="max-w-3xl border-orange-300/20 bg-[#1a120d]/80">
          <CardContent className="py-10 text-center">
            <FolderHeart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-display text-xl text-orange-100">Collections are not publicly available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You can join the waitlist or check billing once Pro opens.
            </p>
            {proAccess.shouldShowWaitlist ? (
              <p className="mt-4 text-sm">
                <Link href="/waitlist" className="text-primary hover:underline">
                  Join the Pro waitlist
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <CollectionsPageContent />;
}
