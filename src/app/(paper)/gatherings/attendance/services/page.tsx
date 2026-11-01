"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  CalendarClock,
  Pause,
  PencilLine,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  RowActions,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useAttendanceServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useArchiveService,
  useRestoreArchiveService,
  SERVICE_CATEGORIES,
  type ChurchService,
  type ServiceCategory,
} from "@/hooks/use-attendance";
import { useBranchesList } from "@/hooks/use-branches";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PAGE_SIZE = 15;

interface Draft {
  name: string;
  category: "" | ServiceCategory;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
  branchId: string;
}

const BLANK: Draft = { name: "", category: "", dayOfWeek: null, startTime: "", endTime: "", isActive: true, branchId: "" };

function fromService(s: ChurchService): Draft {
  return {
    name: s.name,
    category: s.category ?? "",
    dayOfWeek: s.dayOfWeek ?? null,
    startTime: (s.startTime ?? "").slice(0, 5),
    endTime: (s.endTime ?? "").slice(0, 5),
    isActive: s.isActive,
    branchId: s.branchId ?? "",
  };
}

function changedFields(s: ChurchService, d: Draft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.name.trim() && d.name.trim() !== s.name) out.name = d.name.trim();
  if ((s.category ?? "") !== d.category) out.category = d.category || null;
  if ((s.dayOfWeek ?? null) !== d.dayOfWeek) out.dayOfWeek = d.dayOfWeek;
  if ((s.startTime ?? "").slice(0, 5) !== d.startTime) out.startTime = d.startTime || null;
  if ((s.endTime ?? "").slice(0, 5) !== d.endTime) out.endTime = d.endTime || null;
  if (s.isActive !== d.isActive) out.isActive = d.isActive;
  return out;
}

export default function AttendanceServicesPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canManage = ready && can("attendance:services", "update");
  const canCreate = ready && (can("attendance:services", "create") || can("attendance", "create"));
  const canDelete = ready && (can("attendance:services", "delete") || can("attendance", "delete"));
  const isHq = !!profile?.isAdminHq;

  const [page, setPage] = React.useState(1);
  const [category, setCategory] = React.useState("all");
  const [archivedView, setArchivedView] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ChurchService | null>(null);
  const [draft, setDraft] = React.useState<Draft>(BLANK);
  const [deleteTarget, setDeleteTarget] = React.useState<ChurchService | null>(null);

  const params = {
    page,
    limit: PAGE_SIZE,
    archived: archivedView || undefined,
    category: category === "all" ? undefined : category,
  };
  const services = useAttendanceServices(params);
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const createService = useCreateService();
  const updateService = useUpdateService(editing?.serviceId ?? "");
  const deleteService = useDeleteService();
  const archive = useArchiveService();
  const restore = useRestoreArchiveService();

  const rows = services.data?.data ?? [];
  const total = services.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, services.data?.meta?.totalPages ?? 1);

  const branchNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches.data?.data ?? []) map.set(b.branchId, b.name);
    if (!isHq && profile?.branchId && !map.has(profile.branchId)) {
      map.set(profile.branchId, profile?.branch?.name ?? "Your branch");
    }
    return map;
  }, [branches.data, isHq, profile?.branchId, profile?.branch?.name]);

  const openCreate = () => { setEditing(null); setDraft(BLANK); setFormOpen(true); };
  const openEdit = (s: ChurchService) => { setEditing(s); setDraft(fromService(s)); setFormOpen(true); };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) { toast.error("A service needs a name."); return; }
    if (editing) {
      const changed = changedFields(editing, draft);
      if (isHq && draft.branchId && draft.branchId !== editing.branchId) changed.branchId = draft.branchId;
      if (!Object.keys(changed).length) { setFormOpen(false); return; }
      updateService.mutate(changed as never, {
        onSuccess: () => { toast.success("Service updated."); setFormOpen(false); },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't save the service.")),
      });
      return;
    }
    createService.mutate(
      {
        name: draft.name.trim(),
        category: draft.category || undefined,
        dayOfWeek: draft.dayOfWeek ?? undefined,
        startTime: draft.startTime || undefined,
        endTime: draft.endTime || undefined,
        isActive: draft.isActive,
        branchId: isHq && draft.branchId ? draft.branchId : undefined,
      },
      {
        onSuccess: () => { toast.success("The rota has a new rhythm."); setFormOpen(false); },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't create the service.")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Attendance"
        title="The weekly rhythm."
        description="Services, classes and meetings — each with its own window for counting heads."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={openCreate}>
              <Plus className="size-3.5" /> Add service
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Services" value={total} tone="brand" icon={<CalendarClock className="size-4" />} deltaLabel={archivedView ? "archived" : "matching filters"} />
        <StatCard label="Active here" value={rows.filter((s) => s.isActive).length} tone="moss" />
        <StatCard label="Check-ins all-time" value={rows.reduce((sum, s) => sum + (s.attendanceCount ?? 0), 0)} tone="sky" deltaLabel="on this page" />
        <StatCard label="Branches" value={new Set(rows.map((s) => s.branchId ?? "church-wide")).size} tone="gold" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={category === "all"} onClick={() => { setCategory("all"); setPage(1); }}>All</FilterChip>
        {SERVICE_CATEGORIES.map((item) => (
          <FilterChip key={item.value} active={category === item.value} onClick={() => { setCategory(item.value); setPage(1); }}>
            {item.label}
          </FilterChip>
        ))}
        <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>Archived</FilterChip>
      </div>

      {services.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title={archivedView ? "Nothing archived" : "No services yet"}
          description="Services are the weekly heartbeat that attendance follows."
        />
      ) : (
        <div className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          {rows.map((service) => (
            <ServiceRow
              key={service.serviceId}
              service={service}
              branchLabel={service.branchId ? branchNames.get(service.branchId) ?? "" : ""}
              canManage={!!canManage}
              canDelete={!!canDelete}
              onEdit={() => openEdit(service)}
              onDelete={() => setDeleteTarget(service)}
              onArchive={() => archive.mutate(service.serviceId, {
                onSuccess: () => toast(`${service.name} archived — attendance history kept.`),
                onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't archive.")),
              })}
              onRestore={() => restore.mutate(service.serviceId, {
                onSuccess: () => toast(`${service.name} is back in the rota.`),
                onError: () => toast.error("Couldn't restore it."),
              })}
            />
          ))}
          <div className="flex items-center justify-between bg-muted/20 px-5 py-2.5 text-[11px] text-ink-faint">
            <span>Page <span className="num font-medium text-ink">{page}</span> of <span className="num">{totalPages}</span></span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border-line bg-card">Prev</Button>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-full border-line bg-card">Next</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-2xl border-line bg-card">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? `Edit ${editing.name}` : "New recurring service"}</DialogTitle>
            <DialogDescription className="text-xs">
              Day, time and category drive the check-in windows. Leave day blank for a floating gathering.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Sunday · 11:30" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as ServiceCategory | "" }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="">Mixed</option>
                  {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Day</Label>
                <select value={draft.dayOfWeek ?? ""} onChange={(e) => setDraft((d) => ({ ...d, dayOfWeek: e.target.value === "" ? null : Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="">Any day</option>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Starts</Label>
                <Input type="time" value={draft.startTime} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ends</Label>
                <Input type="time" value={draft.endTime} onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
            </div>
            {isHq ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Branch</Label>
                <select value={draft.branchId} onChange={(e) => setDraft((d) => ({ ...d, branchId: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="">Not assigned</option>
                  {(branches.data?.data ?? []).map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>
            ) : null}
            <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
              <span className="text-xs">Counting active</span>
              <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft((d) => ({ ...d, isActive: !!v }))} />
            </label>
            <Button type="submit" disabled={createService.isPending || updateService.isPending} className="h-10 w-full rounded-lg text-sm">
              {editing ? "Save changes" : "Add to the rota"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Delete this service?"
        description={deleteTarget ? `${deleteTarget.name} will be removed. Attendance history on record usually means archiving is the kinder choice.` : ""}
        confirmLabel="Delete"
        pending={deleteService.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteService.mutate(deleteTarget.serviceId, {
            onSuccess: () => { toast("Service deleted."); setDeleteTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't delete it.")),
          });
        }}
      />
    </div>
  );
}

function ServiceRow({
  service,
  branchLabel,
  canManage,
  canDelete,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
}: {
  service: ChurchService;
  branchLabel: string;
  canManage: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const toggleActive = useUpdateService(service.serviceId);
  return (
    <div className="group flex items-center gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <Link href={`/gatherings/attendance/services/${service.serviceId}`} className="block">
          <p className="flex items-center gap-2 truncate text-xs font-semibold hover:text-brand">
            {service.name}
            {service.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
          </p>
          <p className="num mt-0.5 text-[10px] text-ink-faint">
            {service.dayOfWeek !== undefined && service.dayOfWeek !== null ? DAYS[service.dayOfWeek] : "Any day"}
            {service.startTime ? ` · ${String(service.startTime).slice(0, 5)}` : ""}
            {service.endTime ? `–${String(service.endTime).slice(0, 5)}` : ""}
            {branchLabel ? ` · ${branchLabel}` : ""}
          </p>
        </Link>
      </div>
      <span className="num hidden w-20 shrink-0 text-right text-[11px] text-ink-soft sm:block">
        {service.attendanceCount ?? 0} <span className="text-[9px] text-ink-faint">counted</span>
      </span>
      <RowActions
        actions={[
          {
            label: "Open service",
            icon: <ArrowUpRight />,
            href: `/gatherings/attendance/services/${service.serviceId}`,
          },
          canManage && !service.archivedAt && {
            label: service.isActive ? "Pause counting" : "Resume counting",
            icon: service.isActive ? <Pause /> : <Play />,
            tone: service.isActive ? "success" : "warning",
            disabled: toggleActive.isPending,
            onSelect: () => toggleActive.mutate({ isActive: !service.isActive }, {
              onSuccess: () => toast(`${service.name} ${service.isActive ? "paused" : "counting again"}.`),
            }),
          },
          canManage && {
            label: `Edit ${service.name}`,
            icon: <PencilLine />,
            onSelect: onEdit,
          },
          canManage && !service.archivedAt && {
            label: "Archive service — keeps attendance history",
            icon: <Archive />,
            onSelect: onArchive,
          },
          canManage && service.archivedAt && {
            label: "Restore service",
            icon: <ArchiveRestore />,
            tone: "success",
            onSelect: onRestore,
          },
          canDelete && {
            label: "Delete service",
            icon: <Trash2 />,
            tone: "danger",
            onSelect: onDelete,
          },
        ]}
      />
    </div>
  );
}
