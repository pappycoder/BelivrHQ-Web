"use client";

import { ListToolbar } from "@/components/shared/list-toolbar";

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
import { PageTour, type TourStep } from "@/components/tours/page-tour";
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

const SERVICES_TOUR_STEPS: TourStep[] = [
  { target: ".services-tour-heading", title: "Explore the service register", description: "Review service schedules, branches and counting status. This guide explains the register without creating a service, changing its schedule or recording attendance. Replay it anytime with Take a tour." },
  { target: ".services-tour-summary", title: "Understand totals and page statistics", description: "Services counts all records matching your filters. Active here counts active services on this page. Check-ins all-time sums attendance counts for this page's services. Branches counts their distinct branch scopes, including church-wide services. These are not room headcounts." },
  { target: ".services-tour-search", title: "Find a service", description: "After the tour, type a service name. Search updates after a short pause and returns to page one. It combines with status, category, branch, weekday and Archived filters." },
  { target: ".services-tour-status", title: "Filter counting status", description: "Active and Paused filter whether counting is enabled for a service. These buttons do not pause or resume anything. All removes only the status filter; your other choices still apply." },
  { target: ".services-tour-archive", title: "Review archived services", description: "Archived switches to the archived register. Turn it off to return to regular services. Archiving keeps attendance history, and authorised users can restore a service. It is separate from pausing counting or permanently deleting a service." },
  { target: ".services-tour-category", title: "Choose a service category", description: "Choose a category or All categories to narrow the register. The category describes the service; it does not represent a breakdown of attendance by age. Filtering changes no service records." },
  { target: ".services-tour-branch", title: "Choose a branch scope", description: "HQ accounts can choose a branch or All branches. Other accounts remain within their assigned access. This filter changes the displayed records and returns to the first page; it does not move services between branches." },
  { target: ".services-tour-weekday", title: "Filter a scheduled weekday", description: "Choose a weekday or All weekdays. This matches the service's configured weekday; it is not a search for every occurrence on a calendar date. Use the full service record to review its recurrence and date window." },
  { target: ".services-tour-sort", title: "Arrange the services", description: "Sort by Day of week, Name or Date added. The direction button reverses the order. Sorting returns to page one without changing any service schedule." },
  { target: "[data-list-table='services-list'] > [data-export-ignore]", title: "Columns and selected services", description: "Columns chooses the visible fields. Checkboxes select services on this page and reveal actions available to your account and selected-row exports. Selection alone makes no changes. Review the confirmation before applying a bulk action." },
  { target: ".services-tour-record", title: "Read a service record", description: "Review the name, category, schedule, branch, counting status and all-time check-ins. A schedule may be weekly, one-time or a date range. Select the service name to open its full record; viewing it records no attendance." },
  { target: ".services-tour-manage", title: "Understand the management actions", description: "Hover a row or focus its controls to reveal actions. Depending on permissions, you can Open, Edit, Pause or Resume counting, Archive, Restore or Delete. Archive retains attendance history. Delete is permanent; review its warning carefully and use Archive when keeping history matters." },
  { target: ".services-tour-empty", title: "When no services match", description: "Try another search or loosen the filters. Clear filters resets search, status, category, branch, weekday and Archived view and returns to page one. Your account's access restrictions still apply." },
  { target: ".services-tour-page [aria-label='Pagination']", title: "Browse the matching register", description: "Prev and Next move through filtered results. Rows per page changes how many services are displayed. The range and total follow your filters, and navigation is disabled when there are no more pages." },
  { target: ".services-tour-add", title: "Add a service", description: "Add service opens a form for the name, category, recurrence, schedule and branch. Review the required fields and Counting active setting before saving. Close dismisses the form without creating a service. This button appears only with create access." },
];

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
    <div className="services-tour-page space-y-6">
      <PageHeader
        className="services-tour-heading"
        eyebrow="Gatherings · Attendance"
        title="The weekly rhythm."
        description="Services, classes and meetings, each with its own window for counting heads."
        actions={
          <>
          <PageTour page="Service register" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && services.isSuccess && !formOpen && !deleteTarget} steps={SERVICES_TOUR_STEPS} />
          {canCreate ? (
            <Button
              className="services-tour-add h-9 gap-1.5 rounded-full text-sm"
              onClick={openCreate}
            >
              <Plus className="size-3.5" /> Add service
            </Button>
          ) : null}
          </>
        }
      />

      <div className="services-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <ListToolbar
 search={<SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search services…"
            className="services-tour-search w-full max-w-xs"
          />}
 controls={<>
<div className="services-tour-archive inline-flex"><FilterChip
              active={archivedView}
              onClick={() => {
                setArchivedView((v) => !v);
                setPage(1);
              }}
            >
              Archived
            </FilterChip></div>
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
                  className="services-tour-branch h-9 w-44 rounded-full border-line bg-card text-sm shadow-none"
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
<div className="services-tour-sort flex flex-wrap items-center gap-2"><Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as typeof sortBy);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Sort services"
                data-prefix-icon="none"
                className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none"
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
            /></div>
</>}
>
<div className="services-tour-status flex flex-wrap gap-1.5" role="group" aria-label="Service status filters">
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
<Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Service category"
                className="services-tour-category h-9 w-44 rounded-full border-line bg-card text-sm shadow-none"
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
</ListToolbar>
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
              className="services-tour-weekday h-9 w-44 rounded-full border-line bg-card text-sm shadow-none"
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
              className="h-8 rounded-full text-sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
        {isHq && branches.isError && (
          <button
            className="w-full text-left text-sm text-ink-soft underline"
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
          <div className="overflow-x-auto"><ListTable
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
              <div className="services-tour-manage text-right"><ManageHeading /></div>
            </div>
            <div className="divide-y divide-line/70">
              {rows.map((service) => (
                <div
                  key={service.serviceId}
                  className="group grid grid-cols-[minmax(0,1.6fr)_0.8fr_minmax(0,1.8fr)_1fr_0.8fr_0.7fr_auto] items-center gap-4 px-5 py-3 hover:bg-muted/40"
                >
                  <Link
                    href={`/gatherings/attendance/services/${service.serviceId}`}
                    className="services-tour-record min-w-0"
                  >
                    <span className="block truncate text-sm font-semibold">
                      {service.name}
                    </span>
                  </Link>
                  <span className="text-sm text-ink-soft">
                    {SERVICE_CATEGORIES.find(
                      (item) => item.value === service.category,
                    )?.label ?? "Not specified"}
                  </span>
                  <span
                    className="min-w-0 text-sm text-ink-soft"
                    title={scheduleSummary(service)}
                  >
                    <span className="block truncate">
                      {scheduleSummary(service)}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {service.recurrence === "one_time"
                        ? "One-time"
                        : service.recurrence === "multi_day"
                          ? "Date range"
                          : "Weekly"}
                    </span>
                  </span>
                  <span className="truncate text-sm text-ink-soft">
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
                  <span className="num text-right text-sm">
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
          </ListTable></div>
            {!rows.length && (
              <div className="services-tour-empty p-6">
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
