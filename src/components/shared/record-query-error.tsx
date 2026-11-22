import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DetailHeading, DetailNavigation } from "@/components/paper/section";
import { ErrorState } from "@/components/shared/error-state";
import { recordErrorStatus } from "@/lib/record-query-error";

/** Retain a way back while the shared retry verifies the session and reloads. */
export function RecordQueryError({ title, error, backHref, backLabel }: {
  title: string;
  error: unknown;
  backHref: string;
  backLabel: string;
}) {
  const forbidden = recordErrorStatus(error) === 403;
  return (
    <div className="space-y-6">
      <DetailNavigation>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-3 shrink-0" /> {backLabel}
        </Link>
      </DetailNavigation>
      <DetailHeading>{title}</DetailHeading>
      <ErrorState
        title={forbidden ? "Access denied" : `Unable to load ${title.toLowerCase()}`}
        description={forbidden ? "Your account cannot open this record. Contact your church administrator if you need access." : undefined}
      />
    </div>
  );
}
