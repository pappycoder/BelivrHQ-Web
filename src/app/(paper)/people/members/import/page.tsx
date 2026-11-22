"use client";

import Link from "next/link";
import { PublicRegistrationLink } from "@/components/intake/intake-register";
import { PeopleImportPage } from "@/components/shared/people-import-page";

export default function MembersImportPage() {
  return (
    <div className="space-y-6">
      <PeopleImportPage
        kind="members"
        tourPage="Import people"
        returnHref="/people/members"
        heading={{
          className: "members-import-heading",
          eyebrow: (<Link href="/people/members" className="flex items-center gap-1.5 hover:text-ink">
            ← People · Members
          </Link>),
          title: "Bring your people across.",
          description: "Upload your current list, map the columns, and import in reviewable batches. Nothing is saved until you confirm.",
        }}
        introduction={<div className="members-import-public paper-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"><p>Collect registrations directly using your branch’s public link.</p><PublicRegistrationLink kind="members" /></div>}
      />

    </div>
  );
}
