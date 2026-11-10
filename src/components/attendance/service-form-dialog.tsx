"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { FilterChip } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useCreateService,
  useUpdateService,
  SERVICE_CATEGORIES,
  type ChurchService,
  type ServiceCategory,
} from "@/hooks/use-attendance";
import { useBranchesList } from "@/hooks/use-branches";
import {
  SCHEDULE_RECURRENCES,
  SCHEDULE_RECURRENCE_LABELS,
  type ScheduleRecurrence,
} from "@/lib/schedule-occurrence";

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Draft {
  name: string;
  category: "" | ServiceCategory;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  recurrence: ScheduleRecurrence;
  startsOn: string;
  endsOn: string;
  isActive: boolean;
  branchId: string;
}

const BLANK: Draft = {
  name: "",
  category: "",
  dayOfWeek: null,
  startTime: "",
  endTime: "",
  recurrence: "weekly",
  startsOn: "",
  endsOn: "",
  isActive: true,
  branchId: "",
};

function fromService(s: ChurchService): Draft {
  return {
    name: s.name,
    category: s.category ?? "",
    dayOfWeek: s.dayOfWeek ?? null,
    startTime: (s.startTime ?? "").slice(0, 5),
    endTime: (s.endTime ?? "").slice(0, 5),
    recurrence: s.recurrence ?? "weekly",
    startsOn: s.startsOn ?? "",
    endsOn: s.endsOn ?? "",
    isActive: s.isActive,
    branchId: s.branchId ?? "",
  };
}

/** Normalises the date window for a recurrence before save/compare. */
function scheduleFields(d: Draft) {
  return {
    recurrence: d.recurrence,
    startsOn: d.startsOn || null,
    endsOn: d.recurrence === "weekly" || d.recurrence === "multi_day"
      ? d.endsOn || null
      : null,
  };
}

function changedFields(s: ChurchService, d: Draft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.name.trim() && d.name.trim() !== s.name) out.name = d.name.trim();
  if ((s.category ?? "") !== d.category) out.category = d.category || null;
  if ((s.dayOfWeek ?? null) !== d.dayOfWeek) out.dayOfWeek = d.dayOfWeek;
  if ((s.startTime ?? "").slice(0, 5) !== d.startTime) out.startTime = d.startTime || null;
  if ((s.endTime ?? "").slice(0, 5) !== d.endTime) out.endTime = d.endTime || null;
  const schedule = scheduleFields(d);
  if ((s.recurrence ?? "weekly") !== schedule.recurrence) out.recurrence = schedule.recurrence;
  if ((s.startsOn ?? null) !== schedule.startsOn) out.startsOn = schedule.startsOn;
  if ((s.endsOn ?? null) !== schedule.endsOn) out.endsOn = schedule.endsOn;
  if (s.isActive !== d.isActive) out.isActive = d.isActive;
  return out;
}

/**
 * Shared New/Edit service dialog — the same recurrence, time-window and
 * branch semantics for the services directory and the calendar desk.
 */
export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  defaultDayOfWeek,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing service to edit; omit (or null) to create a new one. */
  service?: ChurchService | null;
  /** Preselected weekday for the blank create draft (e.g. the calendar day picked). */
  defaultDayOfWeek?: number | null;
}) {
  const { ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const [draft, setDraft] = React.useState<Draft>(BLANK);
  const branches = useBranchesList({ limit: 100 }, { enabled: ready && isHq });
  const createService = useCreateService();
  const updateService = useUpdateService(service?.serviceId ?? "");

  React.useEffect(() => {
    if (!open) return;
    setDraft(
      service
        ? fromService(service)
        : { ...BLANK, dayOfWeek: defaultDayOfWeek ?? null },
    );
  }, [open, service, defaultDayOfWeek]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) { toast.error("A service needs a name."); return; }
    const schedule = scheduleFields(draft);
    if (schedule.recurrence === "one_time" && !schedule.startsOn) {
      toast.error("Pick the date this one-time service happens.");
      return;
    }
    if (schedule.recurrence === "multi_day") {
      if (!schedule.startsOn || !schedule.endsOn) {
        toast.error("A date-range service needs a start and end date.");
        return;
      }
      if (schedule.endsOn < schedule.startsOn) {
        toast.error("The end date must be on or after the start date.");
        return;
      }
    }
    if (service) {
      const changed = changedFields(service, draft);
      if (isHq && draft.branchId && draft.branchId !== service.branchId) changed.branchId = draft.branchId;
      if (!Object.keys(changed).length) { onOpenChange(false); return; }
      updateService.mutate(changed as never, {
        onSuccess: () => { toast.success("Service updated."); onOpenChange(false); },
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
        recurrence: schedule.recurrence,
        startsOn: schedule.startsOn ?? undefined,
        endsOn: schedule.endsOn ?? undefined,
        isActive: draft.isActive,
        branchId: isHq && draft.branchId ? draft.branchId : undefined,
      },
      {
        onSuccess: () => { toast.success("Service added."); onOpenChange(false); },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't create the service.")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-line bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">{service ? `Edit ${service.name}` : "New service"}</DialogTitle>
          <DialogDescription className="text-xs">
            Recurrence, time and category drive the check-in windows. Weekly services can float on any day; one-time and date-range services only accept their own dates.
          </DialogDescription>
        </DialogHeader>
        <ValidatedForm onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label required className="text-xs">Name</Label>
            <Input required value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Sunday · 11:30" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as ServiceCategory | "" }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
              <option value="">Mixed</option>
              {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Recurrence</Label>
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_RECURRENCES.map((recurrence) => (
                <FilterChip
                  key={recurrence}
                  active={draft.recurrence === recurrence}
                  onClick={() => setDraft((d) => ({ ...d, recurrence }))}
                >
                  {SCHEDULE_RECURRENCE_LABELS[recurrence]}
                </FilterChip>
              ))}
            </div>
          </div>
          {draft.recurrence === "weekly" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Day</Label>
                <select value={draft.dayOfWeek ?? ""} onChange={(e) => setDraft((d) => ({ ...d, dayOfWeek: e.target.value === "" ? null : Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="">Any day</option>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Starts</Label>
                <Input picker="wheel" type="time" value={draft.startTime} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ends</Label>
                <Input picker="wheel" type="time" value={draft.endTime} onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From (optional)</Label>
                <Input picker="wheel" type="date" value={draft.startsOn} onChange={(e) => setDraft((d) => ({ ...d, startsOn: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Until (optional)</Label>
                <Input picker="wheel" type="date" value={draft.endsOn} onChange={(e) => setDraft((d) => ({ ...d, endsOn: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
            </div>
          ) : draft.recurrence === "one_time" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label required className="text-xs">Date</Label>
                <Input required picker="wheel" type="date" value={draft.startsOn} onChange={(e) => setDraft((d) => ({ ...d, startsOn: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Starts</Label>
                <Input picker="wheel" type="time" value={draft.startTime} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ends</Label>
                <Input picker="wheel" type="time" value={draft.endTime} onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label required className="text-xs">Start date</Label>
                <Input required picker="wheel" type="date" value={draft.startsOn} onChange={(e) => setDraft((d) => ({ ...d, startsOn: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label required className="text-xs">End date</Label>
                <Input required picker="wheel" type="date" value={draft.endsOn} onChange={(e) => setDraft((d) => ({ ...d, endsOn: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Starts</Label>
                <Input picker="wheel" type="time" value={draft.startTime} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ends</Label>
                <Input picker="wheel" type="time" value={draft.endTime} onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
            </div>
          )}
          {isHq ? (
            <div className="space-y-1.5">
              <Label required className="text-xs">Branch</Label>
              <select required value={draft.branchId} onChange={(e) => setDraft((d) => ({ ...d, branchId: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                <option value="">Select a branch</option>
                {(branches.data?.data ?? []).map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
              </select>
            </div>
          ) : null}
          <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
            <span className="text-xs">Counting active</span>
            <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft((d) => ({ ...d, isActive: !!v }))} />
          </label>
          <Button type="submit" disabled={createService.isPending || updateService.isPending} className="h-10 w-full rounded-lg text-sm">
            {service ? "Save changes" : "Add service"}
          </Button>
        </ValidatedForm>
      </DialogContent>
    </Dialog>
  );
}
