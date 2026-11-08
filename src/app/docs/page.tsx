"use client";

import { LoadingState } from "@/components/shared/loading-state";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { legacyHelpSections } from "@/lib/help/recommendations";

/** Keep old bookmarks useful without mounting a second help screen in the dashboard. */
export default function DocsPage() {
  const router = useRouter();
  useEffect(() => {
    const slug = legacyHelpSections[window.location.hash.slice(1)];
    router.replace(slug ? `/help/${slug}` : `/help${window.location.search}`);
  }, [router]);
  return (
    <div className="space-y-4 p-6">
      <LoadingState label="Opening the Help Centre" variant="detail" />
      <Link href="/help" className="underline">
        Help Centre
      </Link>
    </div>
  );
}
