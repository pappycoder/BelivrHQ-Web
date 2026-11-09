"use client";

import Link from "next/link";
import { PublicRegistrationLink } from "@/components/intake/intake-register";
import { PageHeader } from "@/components/paper/section";
import { PeopleImportPage } from "@/components/shared/people-import-page";

export default function VisitorsImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/people/visitors" className="flex items-center gap-1.5 hover:text-ink">
            ← People · Visitors
          </Link>
        }
        title="Bring last season&apos;s guests across."
        description="Upload a visitor list, map the columns, and import in reviewable batches. Duplicates surface before anything is saved."
      />
      <div className="paper-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"><p>Collect registrations directly using your branch’s public link.</p><PublicRegistrationLink kind="visitors" /></div>
      <PeopleImportPage kind="visitors" />
    </div>
  );
}
