"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
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
  ManageHeading,
  RowActions,
  SearchField,
  SortDirectionToggle,
} from "@/components/paper/primitives";
import { ListTable } from "@/components/shared/list-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ServiceFormDialog,
  DAYS,
} from "@/components/attendance/service-form-dialog";
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
  type ListServicesParams,
} from "@/hooks/use-attendance";
import { useBranchesList } from "@/hooks/use-branches";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const time = service.startTime
    ? ` · ${String(service.startTime).slice(0, 5)}`
    : "";
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
  const canRead = ready && can("attendance:services", "read");
  const canManage = ready && can("attendance:services", "update");
  const canCreate =
    ready &&
    (can("attendance:services", "create") || can("attendance", "create"));
  const canDelete =
    ready &&
    (can("attendance:services", "delete") || can("attendance", "delete"));
  const isHq = !!profile?.isAdminHq;

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [branchId, setBranchId] = React.useState("all");
  const [sortBy, setSortBy] =
    React.useState<NonNullable<ListServicesParams["sortBy"]>>("day_of_week");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [weekday, setWeekday] = React.useState("all");
  const [archivedView, setArchivedView] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formService, setFormService] = React.useState<ChurchService | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<ChurchService | null>(
    null,
  );

  const params = {
    page,
    limit: perPage,
    search: search || undefined,
    branchId: isHq && branchId !== "all" ? branchId : undefined,
    sortBy,
    sortOrder,
    archived: archivedView || undefined,
    category: category === "all" ? undefined : category,
    isActive: status === "all" ? undefined : status === "active",
    dayOfWeek: weekday === "all" ? undefined : Number(weekday),
  };
  const services = useAttendanceServices(params, { enabled: canRead });
  const branches = useBranchesList(
    { limit: 100 },
    { enabled: canRead && isHq },
  );
  const deleteService = useDeleteService();
  const archive = useArchiveService();
  const restore = useRestoreArchiveService();

  const rows = services.data?.data ?? [];
  const total = services.data?.meta?.total ?? 0;

  React.useEffect(() => {
    if (!services.data || services.isFetching) return;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    if (page > lastPage) setPage(lastPage);
  }, [services.data, services.isFetching, total, page, perPage]);
  const hasFilters =
    !!searchInput ||
    category !== "all" ||
    branchId !== "all" ||
    archivedView ||
    status !== "all" ||
    weekday !== "all";
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("all");
    setBranchId("all");
    setArchivedView(false);
    setStatus("all");
    setWeekday("all");
    setPage(1);
  };

  const branchNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches.data?.data ?? []) map.set(b.branchId, b.name);
    if (!isHq && profile?.branchId && !map.has(profile.branchId)) {
      map.set(profile.branchId, profile?.branch?.name ?? "Your branch");
    }
    return map;
  }, [branches.data, isHq, profile?.branchId, profile?.branch?.name]);

  const openCreate = () => {
    setFormService(null);
    setFormOpen(true);
  };
  const openEdit = (s: ChurchService) => {
    setFormService(s);
    setFormOpen(true);
  };

  if (ready && !canRead)
    return (
      <EmptyState
        className="paper-card bg-card"
        icon={<CalendarClock />}
        title="Service list is outside your access"
        description="Your role needs access to the service register."
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Attendance"
        title="The weekly rhythm."
        description="Services, classes and meetings, each with its own window for counting heads."
        actions={
          canCreate ? (
            <Button
              className="h-9 gap-1.5 rounded-full text-xs"
              onClick={openCreate}
            >
              <Plus className="size-3.5" /> Add service
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Services"
          value={total}
          tone="brand"
          icon={<CalendarClock className="size-4" />}
          deltaLabel={archivedView ? "archived" : "matching filters"}
        />
        <StatCard
          label="Active here"
          value={rows.filter((s) => s.isActive).length}
          tone="moss"
        />
        <StatCard
          label="Check-ins all-time"
          value={rows.reduce((sum, s) => sum + (s.attendanceCount ?? 0), 0)}
          tone="sky"
          deltaLabel="on this page"
        />
        <StatCard
          label="Branches"
          value={new Set(rows.map((s) => s.branchId ?? "church-wide")).size}
          tone="gold"
        />
      </div>

      <div role="group" aria-label="Service list filters" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search services…"
            className="w-full max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              ["all", "All"],
              ["active", "Active"],
              ["paused", "Paused"],
            ].map(([value, label]) => (
              <FilterChip
                key={value}
                active={status === value}
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {label}
              </FilterChip>
            ))}
          </div>
          <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
            <FilterChip
              active={archivedView}
              onClick={() => {
                setArchivedView((v) => !v);
                setPage(1);
              }}
            >
              Archived
            </FilterChip>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Service category"
                className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {SERVICE_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isHq && (
              <Select
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="Service branch"
                  data-prefix-icon="building"
                  disabled={branches.isLoading || branches.isError}
                  className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {(branches.data?.data ?? []).map((branch) => (
                    <SelectItem key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as typeof sortBy);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Sort services"
                data-prefix-icon="none"
                className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <ArrowUpDown className="size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day_of_week">Day of week</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created_at">Date added</SelectItem>
              </SelectContent>
            </Select>
            <SortDirectionToggle
              ascending={sortOrder === "asc"}
              onToggle={() => {
                setSortOrder((value) => (value === "asc" ? "desc" : "asc"));
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={weekday}
            onValueChange={(value) => {
              setWeekday(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Service weekday"
              className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All weekdays</SelectItem>
              {DAYS.map((day, index) => (
                <SelectItem key={day} value={String(index)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-[11px]"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
        {isHq && branches.isError && (
          <button
            className="w-full text-left text-xs text-ink-soft underline"
            onClick={() => branches.refetch()}
          >
            Couldn’t load branches. Retry
          </button>
        )}
      </div>

      {services.isError ? (
        <EmptyState
          icon={<CalendarClock />}
          className="paper-card bg-card"
          title="Services could not be loaded"
          description="Try loading the register again."
          action={
            <Button variant="outline" onClick={() => services.refetch()}>
              Retry
            </Button>
          }
        />
      ) : services.isLoading || !ready ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <ListTable
            tableId="services-list"
            label="Service register"
            recordType="service"
            recordKey="serviceId"
            records={rows}
            className="min-w-[900px]"
          >
            <div className="rule-label grid grid-cols-[minmax(0,1.6fr)_0.8fr_minmax(0,1.8fr)_1fr_0.8fr_0.7fr_auto] items-center gap-4 border-b border-line px-5 py-2.5">
              <span>Service</span>
              <span>Category</span>
              <span>Schedule</span>
              <span>Branch</span>
              <span>Status</span>
              <span className="text-right">Check-ins</span>
              <ManageHeading />
            </div>
            <div className="divide-y divide-line/70">
              {rows.map((service) => (
                <div
                  key={service.serviceId}
                  className="group grid grid-cols-[minmax(0,1.6fr)_0.8fr_minmax(0,1.8fr)_1fr_0.8fr_0.7fr_auto] items-center gap-4 px-5 py-3 hover:bg-muted/40"
                >
                  <Link
                    href={`/gatherings/attendance/services/${service.serviceId}`}
                    className="min-w-0"
                  >
                    <span className="block truncate text-xs font-semibold">
                      {service.name}
                    </span>
                  </Link>
                  <span className="text-[11px] text-ink-soft">
                    {SERVICE_CATEGORIES.find(
                      (item) => item.value === service.category,
                    )?.label ?? "Not specified"}
                  </span>
                  <span
                    className="min-w-0 text-[11px] text-ink-soft"
                    title={scheduleSummary(service)}
                  >
                    <span className="block truncate">
                      {scheduleSummary(service)}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink-faint">
                      {service.recurrence === "one_time"
                        ? "One-time"
                        : service.recurrence === "multi_day"
                          ? "Date range"
                          : "Weekly"}
                    </span>
                  </span>
                  <span className="truncate text-[11px] text-ink-soft">
                    {service.branchId
                      ? branchNames.get(service.branchId) || "Not available"
                      : "Church-wide"}
                  </span>
                  <span>
                    <Tag
                      tone={
                        service.archivedAt
                          ? "neutral"
                          : service.isActive
                            ? "moss"
                            : "gold"
                      }
                    >
                      {service.archivedAt
                        ? "Archived"
                        : service.isActive
                          ? "Active"
                          : "Paused"}
                    </Tag>
                  </span>
                  <span className="num text-right text-[11px]">
                    {service.attendanceCount ?? 0}
                  </span>
                  <ServiceActions
                    service={service}
                    canManage={!!canManage}
                    canDelete={!!canDelete}
                    onEdit={() => openEdit(service)}
                    onDelete={() => setDeleteTarget(service)}
                    onBulkDelete={() =>
                      deleteService.mutateAsync(service.serviceId)
                    }
                    onArchive={() =>
                      archive.mutateAsync(service.serviceId, {
                        onSuccess: () =>
                          toast(
                            `${service.name} archived. Attendance history is kept.`,
                          ),
                        onError: (error) =>
                          toast.error(
                            getToastErrorMessage(error, "Couldn't archive."),
                          ),
                      })
                    }
                    onRestore={() =>
                      restore.mutateAsync(service.serviceId, {
                        onSuccess: () =>
                          toast(`${service.name} is back in the rota.`),
                        onError: () => toast.error("Couldn't restore it."),
                      })
                    }
                  />
                </div>
              ))}
            </div>
            {!rows.length && (
              <div className="p-6">
                <EmptyState
                  className="bg-card"
                  icon={<CalendarClock />}
                  title={hasFilters ? "No services match" : "No services yet"}
                  description="Try another search or adjust the filters."
                  action={
                    hasFilters ? (
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    ) : canCreate ? (
                      <Button onClick={openCreate}>Add service</Button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </ListTable>
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={(value) => {
              setPerPage(value);
              setPage(1);
            }}
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
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed. Attendance history on record usually means archiving is the kinder choice.`
            : ""
        }
        confirmLabel="Delete"
        pending={deleteService.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteService.mutate(deleteTarget.serviceId, {
            onSuccess: () => {
              toast("Service deleted.");
              setDeleteTarget(null);
            },
            onError: (e) =>
              toast.error(getToastErrorMessage(e, "Couldn't delete it.")),
          });
        }}
      />
    </div>
  );
}

function ServiceActions({
  service,
  canManage,
  canDelete,
  onEdit,
  onDelete,
  onBulkDelete,
  onArchive,
  onRestore,
}: {
  service: ChurchService;
  canManage: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onBulkDelete: () => Promise<unknown>;
  onArchive: () => Promise<unknown>;
  onRestore: () => Promise<unknown>;
}) {
  const toggleActive = useUpdateService(service.serviceId);
  return (
    <RowActions
      actions={[
        {
          label: "Open service",
          icon: <ArrowUpRight />,
          href: `/gatherings/attendance/services/${service.serviceId}`,
        },
        canManage &&
          !service.archivedAt && {
            label: service.isActive ? "Pause counting" : "Resume counting",
            bulk: {
              key: service.isActive ? "pause" : "resume",
              label: service.isActive
                ? "Pause selected services"
                : "Resume selected services",
              run: () =>
                toggleActive.mutateAsync({ isActive: !service.isActive }),
            },
            confirmation: { subject: service.name },
            icon: service.isActive ? <Pause /> : <Play />,
            tone: service.isActive ? "success" : "warning",
            disabled: toggleActive.isPending,
            onSelect: () =>
              toggleActive.mutateAsync(
                { isActive: !service.isActive },
                {
                  onSuccess: () =>
                    toast(
                      `${service.name} ${service.isActive ? "paused" : "counting again"}.`,
                    ),
                },
              ),
          },
        canManage && {
          label: `Edit ${service.name}`,
          icon: <PencilLine />,
          onSelect: onEdit,
        },
        canManage &&
          !service.archivedAt && {
            label: "Archive service and keep attendance history",
            confirmation: { subject: service.name },
            icon: <Archive />,
            onSelect: onArchive,
            bulk: {
              key: "archive",
              label: "Archive selected services",
              description: "Attendance history is kept.",
              run: onArchive,
            },
          },
        canManage &&
          service.archivedAt && {
            label: "Restore service",
            confirmation: { subject: service.name },
            icon: <ArchiveRestore />,
            tone: "success",
            onSelect: onRestore,
            bulk: {
              key: "restore",
              label: "Restore selected services",
              run: onRestore,
            },
          },
        canDelete && {
          label: "Delete service",
          icon: <Trash2 />,
          tone: "danger",
          onSelect: onDelete,
          bulk: {
            key: "delete",
            label: "Delete selected services permanently",
            destructive: true,
            description:
              "Deletion is permanent. Services with attendance history should be archived instead.",
            run: onBulkDelete,
          },
        },
      ]}
    />
  );
}
