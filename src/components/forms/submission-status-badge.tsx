"use client";

import { formatStatusLabel } from "@/lib/status-label";


import { Tag, type Tone } from "@/components/paper/stat";
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/hooks/use-forms";

const tones: Record<SubmissionStatus, Tone> = {
  pending: "gold",
  approved: "moss",
  rejected: "rose",
};

/** Shared by the register's table/cards, the legacy table and detail dialog. */
export function SubmissionStatusBadge({ status }: { status: string }) {
  return <Tag tone={tones[status as SubmissionStatus] ?? "neutral"} className="shrink-0">
    {SUBMISSION_STATUS_LABELS[status as SubmissionStatus] ?? formatStatusLabel(status)}
  </Tag>;
}
