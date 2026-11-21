"use client";

import { formatStatusLabel } from "@/lib/status-label";


import { Tag, type Tone } from "@/components/paper/stat";
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from "@/hooks/use-appointments";

const tones: Record<AppointmentStatus, Tone> = {
  pending: "gold",
  confirmed: "moss",
  completed: "sky",
  cancelled: "neutral",
};

/** One status presentation for the appointment list and detail dialog. */
export function AppointmentStatusBadge({ status }: { status: string }) {
  return <Tag tone={tones[status as AppointmentStatus] ?? "neutral"} dot className="shrink-0">
    {APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] ?? formatStatusLabel(status)}
  </Tag>;
}
