"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Home,
  Mail,
  PencilLine,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
  PersonAvatar,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useVisitor,
  useUpdateVisitorById,
  type FollowUpStatus,
} from "@/hooks/use-visitors";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { VisitorFormDialog } from "@/components/visitors/visitor-form-dialog";
import { ConvertVisitorDialog } from "@/components/visitors/convert-visitor-dialog";
import { DeleteVisitorDialog } from "@/components/visitors/delete-visitor-dialog";

const FOLLOW_UP_OPTIONS: { value: FollowUpStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up_scheduled", label: "Scheduled" },
  { value: "interested", label: "Interested" },
  { value: "converted", label: "Converted" },
  { value: "dropped_off", label: "Dropped off" },
];

function formatDate(value?: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function VisitorDetailPage({
  params,
}: {
  params: Promise<{ visitorId: string }>;
}) {
  const { confirm, dialog } = useManageConfirmation();
  const { visitorId } = React.use(params);
  const { can, canAny, ready } = usePermissions();
  const canUpdate = ready && (can("visitors:list", "update") || can("visitors", "update"));
  const canDelete = ready && (can("visitors:list", "delete") || can("visitors", "delete"));
  const canSeeAttendance = ready && canAny("attendance:records:read");

  const visitor = useVisitor(visitorId);
  const updateVisitor = useUpdateVisitorById();
  const visits = useAttendanceRecords({ visitorId, limit: 50 });

  const [editOpen, setEditOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const v = visitor.data;

  if (visitor.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-line" />
        <div className="h-40 animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  if (visitor.isError || !v) {
    return (
      <EmptyState
        icon={<UserRound />}
        title="We couldn&apos;t find this guest"
        description="The link may be old, or the record removed."
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm">
            <Link href="/people/visitors">Back to the pipeline</Link>
          </Button>
        }
      />
    );
  }

  const fullName = `${v.firstName} ${v.lastName ?? ""}`.trim();
  const visitsRows = visits.data?.data ?? [];

  return (
    <div className="space-y-6">
      {dialog}
      <Link
        href="/people/visitors"
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="size-3" /> People · Visitors
      </Link>

      <div className="paper-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PersonAvatar name={fullName} size="xl" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">{fullName}</h1>
                <Tag tone={v.followUpStatus === "converted" ? "moss" : v.followUpStatus === "dropped_off" ? "neutral" : "gold"} dot>
                  {FOLLOW_UP_OPTIONS.find((o) => o.value === v.followUpStatus)?.label ?? v.followUpStatus}
                </Tag>
                {v.convertedMemberId ? (
                  <Link href={`/people/members/${v.convertedMemberId}`}>
                    <Tag tone="brand">
                      <Sparkles className="size-2.5" /> Member profile
                    </Tag>
                  </Link>
                ) : null}
              </div>
              <p className="text-sm text-ink-soft">
                First visit {formatDate(v.firstVisitDate)}
                {v.branchName ? ` · ${v.branchName}` : ""}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {v.email ? (
                  <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm">
                    <a href={`mailto:${v.email}`}>
                      <Mail className="size-3.5" /> Email
                    </a>
                  </Button>
                ) : null}
                {v.phone ? (
                  <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm">
                    <a href={`tel:${v.phone.replace(/[^\d+]/g, "")}`}>
                      <Phone className="size-3.5" /> Call
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <>
                <Button size="sm" className="h-8 gap-1.5 rounded-full text-sm" onClick={() => setEditOpen(true)}>
                  <PencilLine className="size-3.5" /> Edit
                </Button>
                {!v.convertedMemberId ? (
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm" onClick={() => setConvertOpen(true)}>
                    Convert to member
                  </Button>
                ) : null}
              </>
            ) : null}
            {canDelete ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm text-destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard eyebrow="Contact" title="How to reach them">
          <DataList>
            <FieldRow label="Email">{v.email ?? "Not available"}</FieldRow>
            <FieldRow label="Phone">{v.phone ?? "Not available"}</FieldRow>
            <FieldRow label="WhatsApp">{v.whatsappNumber ?? "Not available"}</FieldRow>
            <FieldRow label="Gender">{v.gender ?? "Not available"}</FieldRow>
          </DataList>
        </SectionCard>

        <SectionCard eyebrow="Visit & follow-up" title="Where the conversation stands">
          <div className="space-y-1.5">
            <span className="text-sm text-ink-faint">Follow-up status</span>
            {canUpdate ? (
              <select
                value={v.followUpStatus}
                disabled={updateVisitor.isPending}
                onChange={(event) => { const nextStatus = event.target.value; confirm({ title: "Update follow-up status?", subject: fullName, description: `Change follow-up status to ${nextStatus.replaceAll("_", " ")}?`, onConfirm: () => updateVisitor.mutateAsync(
                    { visitorId: v.id, input: { followUpStatus: nextStatus as FollowUpStatus } },
                    { onSuccess: () => toast("Status updated."), onError: () => toast.error("Couldn't update the status.") },
                  ) }); }}
                className="h-10 w-full rounded-lg border border-line bg-card px-2 text-sm outline-none"
              >
                {FOLLOW_UP_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium">
                {FOLLOW_UP_OPTIONS.find((o) => o.value === v.followUpStatus)?.label ?? v.followUpStatus}
              </p>
            )}
          </div>
          <DataList className="mt-3">
            <FieldRow label="Assigned to">{v.assignedToName ?? "Unassigned"}</FieldRow>
            <FieldRow label="Branch">{v.branchName ?? "Not assigned"}</FieldRow>
            <FieldRow label="Registered">{formatDate(v.createdAt)}</FieldRow>
          </DataList>
          {v.notes ? (
            <p className="mt-3 whitespace-pre-line rounded-lg border border-line bg-card p-3 text-sm leading-relaxed text-ink-soft">
              {v.notes}
            </p>
          ) : null}
        </SectionCard>

        <SectionCard eyebrow="Notes in passing" title="Custom fields">
          {v.customFields && Object.keys(v.customFields).length ? (
            <DataList>
              {Object.entries(v.customFields).map(([key, value]) => (
                <FieldRow key={key} label={key.replace(/[_-]/g, " ")}>
                  {String(value ?? "Not available")}
                </FieldRow>
              ))}
            </DataList>
          ) : (
            <p className="text-sm text-ink-faint">Nothing recorded beyond the form.</p>
          )}
        </SectionCard>
      </div>

      {canSeeAttendance ? (
        <SectionCard
          eyebrow="Being here"
          title="Visit history"
          actions={<span className="num text-sm text-ink-faint">{visits.data?.meta?.total ?? visitsRows.length} check-ins</span>}
          bodyClassName="p-0"
        >
          {visits.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : visitsRows.length ? (
            <div className="divide-y divide-line/70">
              {visitsRows.map((record) => (
                <div key={record.attendanceId} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <CalendarCheck className="size-3.5 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {record.serviceName ?? record.eventName ?? "A gathering"}
                  </span>
                  <Tag tone="neutral">{record.category ?? "Not available"}</Tag>
                  <span className="num w-36 shrink-0 text-right text-sm text-ink-faint">
                    {formatDate(record.checkInAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8">
              <p className="flex flex-col items-center gap-1.5 text-center text-sm text-ink-faint">
                <Home className="size-4" />
                No visits recorded yet.
              </p>
            </div>
          )}
        </SectionCard>
      ) : null}

      <VisitorFormDialog open={editOpen} onOpenChange={setEditOpen} visitor={v} />
      <ConvertVisitorDialog open={convertOpen} onOpenChange={setConvertOpen} visitor={v} />
      <DeleteVisitorDialog open={deleteOpen} onOpenChange={setDeleteOpen} visitors={[v]} />
    </div>
  );
}
