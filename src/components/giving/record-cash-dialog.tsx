"use client";
import { GivingFormSection as StyledGivingFormSection } from "./giving-presentation";

import * as React from "react";
import { format } from "date-fns";
import { getToastErrorMessage, toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGivingCategories,
  useCreateGivingCategory,
  useRecordCashGiving,
  type GivingTransaction,
} from "@/hooks/use-giving";
import { useAttendanceServices } from "@/hooks/use-attendance";
import { usePermissions } from "@/hooks/use-permissions";
import { useEventsList } from "@/hooks/use-events";
import { MemberCombobox } from "@/components/members/member-combobox";
import { AvailableSelect } from "@/components/shared/available-select";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";

/** Built-in pseudo-category for recording a service/event day-total. */
export const OVERALL_TOTAL_CATEGORY = "Overall Total";
const OVERALL_TOTAL_VALUE = "__overall_total__";

type LinkTo = "general" | "member" | "service" | "event";

const LINK_TABS: { value: LinkTo; label: string }[] = [
  { value: "general", label: "General" },
  { value: "member", label: "Member" },
  { value: "service", label: "Service" },
  { value: "event", label: "Event" },
];

export function RecordCashDialog({
  open,
  onOpenChange,
  onRecorded,
  branchId: initialBranchId,
  presentationClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: (transaction: GivingTransaction) => void;
  branchId?: string;
  presentationClassName?: string;
}) {
  const GivingFormSection = presentationClassName
    ? StyledGivingFormSection
    : PlainSection;
  const { data: profile } = useCurrentProfile();
  const { can } = usePermissions();
  const canReadEvents = can("events:list", "read");
  const [selectedBranchId, setSelectedBranchId] = React.useState(
    initialBranchId ?? "",
  );
  const branchId = profile?.isAdminHq ? selectedBranchId : profile?.branchId;
  const branchesQuery = useBranchesList(
    { limit: 100 },
    { enabled: open && !!profile?.isAdminHq },
  );
  React.useEffect(() => {
    if (open) setSelectedBranchId(initialBranchId ?? "");
  }, [open, initialBranchId]);
  const categoriesQuery = useGivingCategories(
    { limit: 100, branchId },
    { enabled: open },
  );
  const servicesQuery = useAttendanceServices(
    { isActive: true, limit: 100, branchId },
    { enabled: open },
  );
  const eventsQuery = useEventsList(
    { limit: 50, branchId },
    { enabled: open && canReadEvents },
  );
  const createCategoryMutation = useCreateGivingCategory();
  const recordMutation = useRecordCashGiving();

  const categories = categoriesQuery.data?.data ?? [];

  const [givingDate, setGivingDate] = React.useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<"cash" | "bank_transfer">("cash");
  const [linkTo, setLinkTo] = React.useState<LinkTo>("general");
  const [memberId, setMemberId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [eventId, setEventId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setGivingDate(format(new Date(), "yyyy-MM-dd"));
      setAmount("");
      setMethod("cash");
      setLinkTo("general");
      setMemberId("");
      setServiceId("");
      setEventId("");
      setCategoryId("");
      setNewCategoryName("");
      setNotes("");
    }
  }, [open]);

  /**
   * Resolves the chosen category to an ID. Built-in "Overall Total" and
   * custom-typed names are created on first use; a duplicate-name rejection
   * resolves to the existing row instead of failing.
   */
  const resolveCategoryId = async (): Promise<string> => {
    if (
      categoryId &&
      categoryId !== OVERALL_TOTAL_VALUE &&
      categoryId !== "__new_category__"
    ) {
      return categoryId;
    }

    const name =
      categoryId === OVERALL_TOTAL_VALUE
        ? OVERALL_TOTAL_CATEGORY
        : newCategoryName.trim();
    if (!name) throw new Error("Please choose or type a category");

    const existing = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.isActive,
    );
    if (existing) return existing.categoryId;

    try {
      const created = await createCategoryMutation.mutateAsync({
        name,
        isRecurring: false,
        branchId,
      });
      return created.categoryId;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/already exists/i.test(message)) {
        const fresh = await api.get<{
          data: { categoryId: string; name: string }[];
        }>(
          `/giving/categories?limit=100&branchId=${encodeURIComponent(branchId ?? "")}`,
        );
        const match = fresh.data.find(
          (c) => c.name.toLowerCase() === name.toLowerCase(),
        );
        if (match) return match.categoryId;
      }
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!givingDate) {
      toast.error("Select a giving date");
      return;
    }
    if (!branchId) {
      toast.error("Select a branch for the giving");
      return;
    }
    const amountNumber = Number(amount);
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (
      (linkTo === "member" && !memberId) ||
      (linkTo === "service" && !serviceId) ||
      (linkTo === "event" && !eventId)
    ) {
      toast.error("Pick who or which the giving belongs to");
      return;
    }

    setPending(true);
    try {
      const resolvedCategoryId = await resolveCategoryId();
      const transaction = await recordMutation.mutateAsync({
        givingDate,
        categoryId: resolvedCategoryId,
        branchId,
        amount: amountNumber,
        type: method,
        memberId: linkTo === "member" ? memberId : undefined,
        serviceId: linkTo === "service" ? serviceId : undefined,
        eventId: linkTo === "event" ? eventId : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(
        `Recorded ${transaction.currency} ${transaction.amount.toLocaleString()}`,
        {
          description: transaction.receiptNumber
            ? `Receipt ${transaction.receiptNumber}`
            : undefined,
        },
      );
      onOpenChange(false);
      onRecorded?.(transaction);
    } catch (error) {
      toast.error("Failed to record giving", {
        description: getToastErrorMessage(error, "Please try again."),
      });
    } finally {
      setPending(false);
    }
  };

  // Select shows the typed-name entry as a pseudo item while in custom mode.
  const categorySelectValue =
    categoryId === OVERALL_TOTAL_VALUE
      ? OVERALL_TOTAL_VALUE
      : newCategoryName
        ? "__new_category__"
        : categoryId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${presentationClassName ?? ""} sm:max-w-[560px] max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle>Record Giving</DialogTitle>
          <DialogDescription>
            Log an NGN cash or bank-transfer gift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <GivingFormSection title="Gift details">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Giving Date *</span>
                <Input picker="wheel"
                  aria-label="Giving Date"
                  type="date"
                  required
                  value={givingDate}
                  onChange={(event) => setGivingDate(event.target.value)}
                  disabled={pending}
                />
              </label>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Branch *</p>
                <AvailableSelect
                  unavailableMessage={
                    profile?.isAdminHq && !branchesQuery.data?.data.length
                      ? "No branches are available. Please try again later."
                      : undefined
                  }
                  value={branchId || undefined}
                  disabled={!profile?.isAdminHq || branchesQuery.isLoading}
                  onValueChange={(value) => {
                    setSelectedBranchId(value);
                    setCategoryId("");
                    setMemberId("");
                    setServiceId("");
                    setEventId("");
                  }}
                >
                  <SelectTrigger className="w-full" aria-label="Giving branch">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {profile?.isAdminHq ? (
                      (branchesQuery.data?.data ?? []).map((branch) => (
                        <SelectItem
                          key={branch.branchId}
                          value={branch.branchId}
                        >
                          {branch.name}
                        </SelectItem>
                      ))
                    ) : profile?.branchId ? (
                      <SelectItem value={profile.branchId}>
                        {profile.branch?.name ?? "Your branch"}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </AvailableSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Amount (NGN) *</p>
                <Input
                  aria-label="Giving amount"
                  type="number"
                  min={1}
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Method *</p>
                <Select
                  value={method}
                  onValueChange={(v) =>
                    setMethod(v as "cash" | "bank_transfer")
                  }
                >
                  <SelectTrigger className="w-full" aria-label="Giving method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Category *</p>
              <Select
                value={categorySelectValue}
                onValueChange={(v) => {
                  setCategoryId(v);
                  if (v !== "__new_category__") setNewCategoryName("");
                }}
              >
                <SelectTrigger className="w-full" aria-label="Giving category">
                  <SelectValue placeholder="Choose or type a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <SelectItem key={c.categoryId} value={c.categoryId}>
                        {c.name}
                      </SelectItem>
                    ))}
                  <SelectItem value={OVERALL_TOTAL_VALUE}>
                    {OVERALL_TOTAL_CATEGORY} (day/event total)
                  </SelectItem>
                  <SelectItem value="__new_category__">
                    + Add new category…
                  </SelectItem>
                </SelectContent>
              </Select>
              {categorySelectValue === "__new_category__" && (
                <Input
                  autoFocus
                  placeholder="Type the new category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Not listed? Pick “+ Add new category…” and type it — it&apos;s
                created automatically.
              </p>
            </div>
          </GivingFormSection>
          <GivingFormSection title="Giver & context">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Linked to</p>
              <div className="flex gap-1 rounded-md border p-1 w-fit">
                {LINK_TABS.filter(
                  (tab) => tab.value !== "event" || canReadEvents,
                ).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setLinkTo(tab.value)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      linkTo === tab.value
                        ? "border border-[var(--workspace-accent-border,var(--primary))] bg-primary text-primary-foreground"
                        : "border border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {linkTo === "member" && (
                <div className="pt-1">
                  <MemberCombobox
                    branchId={branchId}
                    disabled={!branchId}
                    value={memberId}
                    onChange={(id) => setMemberId(id)}
                    placeholder="Search members by name..."
                  />
                </div>
              )}
              {linkTo === "service" && (
                <AvailableSelect
                  value={serviceId}
                  onValueChange={setServiceId}
                  disabled={servicesQuery.isLoading}
                  unavailableMessage={
                    servicesQuery.isError
                      ? "Unable to load services. Please try again."
                      : !servicesQuery.data?.data.length
                        ? "No services are available for this branch."
                        : undefined
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {(servicesQuery.data?.data ?? []).map((s) => (
                      <SelectItem key={s.serviceId} value={s.serviceId}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </AvailableSelect>
              )}
              {linkTo === "event" && (
                <AvailableSelect
                  value={eventId}
                  onValueChange={setEventId}
                  disabled={eventsQuery.isLoading}
                  unavailableMessage={
                    eventsQuery.isError
                      ? "Unable to load events. Please try again."
                      : !eventsQuery.data?.data.length
                        ? "No events are available for this branch."
                        : undefined
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {(eventsQuery.data?.data ?? []).map((ev) => (
                      <SelectItem key={ev.eventId} value={ev.eventId}>
                        {ev.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </AvailableSelect>
              )}
            </div>
          </GivingFormSection>
          <GivingFormSection title="Additional information">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Notes</p>
              <Textarea
                aria-label="Giving notes"
                rows={2}
                placeholder="Optional context, e.g. Sunday first service bucket"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </GivingFormSection>
        </div>

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={pending || !givingDate}
          >
            {pending ? "Recording..." : "Record Giving"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlainSection({
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <div className="space-y-4">{children}</div>;
}
