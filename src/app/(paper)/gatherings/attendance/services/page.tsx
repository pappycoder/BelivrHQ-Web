"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
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
  ListPaginationFooter,
  RowActions,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceFormDialog, DAYS } from "@/components/attendance/service-form-dialog";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useAttendanceServices,
  useUpdateService,
  useDeleteService,
  useArchiveService,
  useRestoreArchiveService,
  SERVICE_CATEGORIES,
  type ChurchService,
} from "@/hooks/use-attendance";
import { useBranchesList } from "@/hooks/use-branches";

const PAGE_SIZE = 15;

function formatScheduleDay(value: string): string {
  return format(new Date(`${value}T00:00:00`), "d MMM yyyy");
}

function scheduleSummary(service: ChurchService): string {
  const recurrence = service.recurrence ?? "weekly";
  if (recurrence === "one_time") {
    return service.startsOn
      ? `One-time · ${formatScheduleDay(service.startsOn)}`
      : "One-time";
  }
  if (recurrence === "multi_day") {
    return service.startsOn && service.endsOn
      ? `Date range · ${formatScheduleDay(service.startsOn)} → ${formatScheduleDay(service.endsOn)}`
      : "Date range";
  }
  const day =
    service.dayOfWeek !== undefined && service.dayOfWeek !== null
      ? DAYS[service.dayOfWeek]
      : "Any day";
  const time = service.startTime ? ` · ${String(service.startTime).slice(0, 5)}` : "";
  const end = service.endTime ? `–${String(service.endTime).slice(0, 5)}` : "";
  const window =
    service.startsOn || service.endsOn
      ? ` · ${service.startsOn ? formatScheduleDay(service.startsOn) : "always"}${
          service.endsOn ? ` → ${formatScheduleDay(service.endsOn)}` : ""
        }`
      : "";
  return `${day}${time}${end}${window}`;
}

export default function AttendanceServicesPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canManage = ready && can("attendance:services", "update");
  const canCreate = ready && (can("attendance:services", "create") || can("attendance", "create"));
  const canDelete = ready && (can("attendance:services", "delete") || can("attendance", "delete"));
  const isHq = !!profile?.isAdminHq;

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [category, setCategory] = React.useState("all");
  const [archivedView, setArchivedView] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formService, setFormService] = React.useState<ChurchService | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ChurchService | null>(null);

  const params = {
    page,
    limit: perPage,
    archived: archivedView || undefined,
    category: category === "all" ? undefined : category,
  };
  const services = useAttendanceServices(params);
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const deleteService = useDeleteService();
  const archive = useArchiveService();
  const restore = useRestoreArchiveService();

  const rows = services.data?.data ?? [];
  const total = services.data?.meta?.total ?? 0;

  const branchNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches.data?.data ?? []) map.set(b.branchId, b.name);
    if (!isHq && profile?.branchId && !map.has(profile.branchId)) {
      map.set(profile.branchId, profile?.branch?.name ?? "Your branch");
    }
    return map;
  }, [branches.data, isHq, profile?.branchId, profile?.branch?.name]);

  const openCreate = () => { setFormService(null); setFormOpen(true); };
  const openEdit = (s: ChurchService) => { setFormService(s); setFormOpen(true); };

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
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="services"
            pending={services.isFetching}
          />
        </div>
      )}

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={formService}
      />

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
            {scheduleSummary(service)}
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
