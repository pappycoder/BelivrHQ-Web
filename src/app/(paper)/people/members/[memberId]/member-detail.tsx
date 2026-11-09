"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarCheck,
  HandCoins,
  Home,
  Mail,
  PencilLine,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react";
import { toast, getToastErrorMessage } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import {
  DataList,
  FieldRow,
  PersonAvatar,
} from "@/components/paper/primitives";
import { TrendChart } from "@/components/paper/charts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberFormDialog } from "@/components/members/member-form-dialog";
import { DeleteMemberDialog } from "@/components/members/delete-member-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  useArchiveMember,
  useRestoreArchiveMember,
  useMember,
  useMemberGivingHistory,
  useMemberAttendanceHistory,
  useAddMemberNote,
  type Member,
  type MemberStatus,
} from "@/hooks/use-members";

const STATUS_TONES: Record<MemberStatus, "moss" | "neutral" | "rose" | "sky"> = {
  active: "moss",
  inactive: "neutral",
  suspended: "rose",
  transferred: "sky",
};

export default function MemberDetail({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { confirm, dialog } = useManageConfirmation();
  const { memberId } = React.use(params);
  const { can, canAny, ready } = usePermissions();
  const member = useMember(memberId);
  const giving = useMemberGivingHistory(memberId);
  const attendance = useMemberAttendanceHistory(memberId);

  const canUpdate = ready && can("members:all", "update");
  const canDelete = ready && can("members:all", "delete");
  const canSeeGiving = ready && canAny("giving:records:read");

  const [editOpen, setEditOpen] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");
  useUnsavedChanges(!!noteDraft.trim());

  const archive = useArchiveMember();
  const restoreArchive = useRestoreArchiveMember();
  const addNote = useAddMemberNote(memberId);

  const data: Member | undefined = member.data;

  if (member.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-line" />
        <div className="h-40 animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  if (member.isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <UserRound className="size-6 text-ink-faint" />
        <p className="text-sm font-medium">We couldn&apos;t find this person.</p>
        <p className="max-w-sm text-xs text-ink-soft">
          They may have been removed, or the link is old.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-1 rounded-full border-line text-xs">
          <Link href="/people/members">Back to the register</Link>
        </Button>
      </div>
    );
  }

  const fullName = `${data.firstName} ${data.lastName}`;
  const givingTotal = (giving.data?.data ?? []).reduce((sum, g) => sum + g.amount, 0);
  const givingCurrency = giving.data?.data?.[0]?.currency;
  const attendanceRows = attendance.data?.data ?? [];

  const giftTrend = Array.from({ length: 6 }).map((_, monthIndex) => {
    const rows = (giving.data?.data ?? []).filter((g) => {
      const d = g.givingDate ?? g.createdAt;
      const date = new Date(d);
      return date.getMonth() === monthIndex && date.getFullYear() === 2026;
    });
    return {
      label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][monthIndex],
      total: rows.reduce((sum, row) => sum + row.amount, 0),
    };
  });

  const customEntries = Object.entries(data.customFields ?? {});

  return (
    <div className="space-y-6">
      {dialog}
      <Link
        href="/people/members"
        className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="size-3" /> People · Members
      </Link>

      <div className="paper-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PersonAvatar name={fullName} src={data.photoUrl} size="xl" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-semibold tracking-tight">
                  {fullName}
                </h1>
                <Tag tone={STATUS_TONES[data.status]} dot>{data.status}</Tag>
                {data.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
              </div>
              <p className="text-xs text-ink-soft">
                Member since {data.memberSince ?? "Not available"}
                {data.city ? ` · ${data.city}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customEntries.slice(0, 3).map(([key, value]) => (
                  <Tag key={key} tone="gold">{key}: {String(value)}</Tag>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.email ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs">
                <a href={`mailto:${data.email}`}>
                  <Mail className="size-3.5" /> Email
                </a>
              </Button>
            ) : null}
            {data.phone ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs">
                <a href={`tel:${data.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone className="size-3.5" /> Call
                </a>
              </Button>
            ) : null}
            {canUpdate && !data.archivedAt ? (
              <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" onClick={() => setEditOpen(true)}>
                <PencilLine className="size-3.5" /> Edit
              </Button>
            ) : null}
            {canUpdate ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full border-line bg-card text-xs"
                disabled={archive.isPending || restoreArchive.isPending}
                onClick={() => confirm({ title: data.archivedAt ? "Restore member?" : "Archive member?", subject: fullName, onConfirm: () => data.archivedAt
                    ? restoreArchive.mutateAsync(data.memberId, { onSuccess: () => toast(`${data.firstName} is back in the active register.`) })
                    : archive.mutateAsync(data.memberId, { onSuccess: () => toast(`${data.firstName} archived. Their records are kept.`) }) })}
              >
                {data.archivedAt ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                {data.archivedAt ? "Restore" : "Archive"}
              </Button>
            ) : null}
            {canDelete && !data.archivedAt ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs text-destructive hover:text-destructive" onClick={() => setDeactivateOpen(true)}>
                Deactivate
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Gifts recorded</span>
          <div>
            <p className="num font-display text-[1.9rem] font-semibold leading-none tracking-tight">
              {giving.data?.data?.length ?? 0}
            </p>
            <p className="num mt-1.5 text-[11px] text-ink-soft">
              {givingTotal > 0
                ? `${new Intl.NumberFormat("en", { style: "currency", currency: givingCurrency === "NGN" ? "NGN" : "USD", maximumFractionDigits: 0 }).format(givingTotal)} total`
                : canSeeGiving ? "No giving yet" : "Giving is hidden for your role"}
            </p>
          </div>
        </div>
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Check-ins on file</span>
          <div>
            <p className="num font-display text-[1.9rem] font-semibold leading-none tracking-tight">
              {attendanceRows.length}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {attendanceRows.length ? `last seen ${formatDate(attendanceRows[0]?.checkInAt ?? attendanceRows[0]?.createdAt)}` : "Attendance appears here as they gather"}
            </p>
          </div>
        </div>
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">In the family since</span>
          <div>
            <p className="font-display text-[1.6rem] font-semibold leading-none tracking-tight">
              {data.memberSince ? data.memberSince.slice(0, 4) : "Not available"}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-soft">added {formatDate(data.createdAt)}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-9 rounded-full border border-line bg-card p-0.5">
          <TabsTrigger value="overview" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
            Overview & notes
          </TabsTrigger>
          {canSeeGiving ? (
            <TabsTrigger value="giving" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
              Giving
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="attendance" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
          <SectionCard eyebrow="Contact" title="How to reach them">
            <DataList>
              <FieldRow label="Email">{data.email ?? "Not available"}</FieldRow>
              <FieldRow label="Phone">{data.phone ?? "Not available"}</FieldRow>
              <FieldRow label="WhatsApp">{data.whatsappNumber ?? "Not available"}</FieldRow>
              <FieldRow label="Birthday">{data.dateOfBirth ?? "Not available"}</FieldRow>
            </DataList>
          </SectionCard>
          <SectionCard eyebrow="Where they are" title="Location & membership">
            <DataList>
              <FieldRow label="Address">{data.address ?? "Not available"}</FieldRow>
              <FieldRow label="City / State">{[data.city, data.state].filter(Boolean).join(", ") || "Not available"}</FieldRow>
              <FieldRow label="Status">{data.status}</FieldRow>
              <FieldRow label="Member since">{data.memberSince ?? "Not available"}</FieldRow>
            </DataList>
          </SectionCard>
          {customEntries.length ? (
            <SectionCard eyebrow="Their story" title="Custom fields">
              <DataList>
                {customEntries.map(([key, value]) => (
                  <FieldRow key={key} label={key}>{String(value) || "Not available"}</FieldRow>
                ))}
              </DataList>
            </SectionCard>
          ) : null}
          <SectionCard
            eyebrow="Pastoral"
            title="Notes"
            className={customEntries.length ? "" : "lg:col-span-2"}
          >
            {data.notes ? (
              <p className="whitespace-pre-line rounded-lg border border-line bg-card p-3 text-[11px] leading-relaxed text-ink-soft">
                {data.notes}
              </p>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-line p-3 text-[11px] text-ink-faint">
                <StickyNote className="size-3.5" /> No notes yet. Add a note to record a conversation or care need.
              </p>
            )}
            {canUpdate ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  rows={3}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Add an admin note for this member…"
                  className="resize-none rounded-lg border-line bg-card text-xs shadow-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 rounded-full text-xs"
                    disabled={!noteDraft.trim() || addNote.isPending}
                    onClick={() =>
                      addNote.mutate(noteDraft.trim(), {
                        onSuccess: () => {
                          setNoteDraft("");
                          toast("Note saved.");
                        },
                        onError: (e) => toast.error(getToastErrorMessage(e, "Failed to add note")),
                      })
                    }
                  >
                    <StickyNote className="size-3" /> Save note
                  </Button>
                </div>
              </div>
            ) : null}
          </SectionCard>
        </TabsContent>

        {canSeeGiving ? (
          <TabsContent value="giving" className="mt-4 space-y-4">
            {giftTrend.some((month) => month.total > 0) ? (
              <SectionCard eyebrow="Pattern" title="Giving across 2026">
                <TrendChart
                  data={giftTrend}
                  series={[{ key: "total", label: "Given", color: "var(--chart-1)" }]}
                  height={180}
                />
              </SectionCard>
            ) : null}
            <SectionCard eyebrow="Ledger" title="Every gift on record" bodyClassName="p-0">
              <div className="divide-y divide-line/70">
                {(giving.data?.data ?? []).map((record) => (
                  <div key={record.id} className="flex items-center gap-3 px-5 py-3">
                    <HandCoins className="size-3.5 shrink-0 text-ink-faint" />
                    <span className="num w-24 shrink-0 text-xs font-semibold">
                      {new Intl.NumberFormat("en", { style: "currency", currency: record.currency === "NGN" ? "NGN" : "USD", maximumFractionDigits: 0 }).format(record.amount)}
                    </span>
                    <span className="text-[11px] text-ink-soft">{formatDate(record.givingDate ?? record.createdAt)}</span>
                    <span className="ml-auto">
                      <Tag tone={record.status === "success" ? "moss" : record.status === "pending" ? "gold" : "rose"}>{record.status}</Tag>
                    </span>
                  </div>
                ))}
                {!giving.data?.data?.length ? (
                  <p className="px-5 py-10 text-center text-xs text-ink-faint">No gifts recorded for this member yet.</p>
                ) : null}
              </div>
            </SectionCard>
          </TabsContent>
        ) : null}

        <TabsContent value="attendance" className="mt-4">
          <SectionCard eyebrow="Gathering" title="Check-in history" bodyClassName="p-0">
            <div className="divide-y divide-line/70">
              {attendanceRows.map((record) => (
                <div key={record.id} className="flex items-center gap-3 px-5 py-3 text-xs">
                  <CalendarCheck className="size-3.5 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate font-medium">{record.serviceName}</span>
                  <span className="num text-[11px] text-ink-soft">{formatDate(record.checkInAt)}</span>
                  <Tag tone={record.source === "self" ? "sky" : "neutral"}>{record.source === "self" ? "Checked in" : record.source}</Tag>
                </div>
              ))}
              {!attendanceRows.length ? (
                <p className="flex flex-col items-center gap-1.5 px-5 py-10 text-center text-xs text-ink-faint">
                  <Home className="size-4" />
                  No check-ins yet. The first one starts a story.
                </p>
              ) : null}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <MemberFormDialog open={editOpen} onOpenChange={setEditOpen} member={data} />
      <DeleteMemberDialog open={deactivateOpen} onOpenChange={setDeactivateOpen} members={[data]} />
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
