"use client";
import { GivingFormSection as StyledGivingFormSection } from "./giving-presentation";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvailableSelect } from "@/components/shared/available-select";
import { MemberCombobox } from "@/components/members/member-combobox";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useGivingCategories,
  useCreateRecurringGiving,
  useRecurringPaymentOptions,
} from "@/hooks/use-giving";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function RecurringGivingDialog({
  open,
  onOpenChange,
  branchId: initialBranchId,
  presentationClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId?: string;
  presentationClassName?: string;
}) {
  const GivingFormSection = presentationClassName
    ? StyledGivingFormSection
    : PlainSection;
  const { data: profile } = useCurrentProfile();
  const [selectedBranch, setSelectedBranch] = useState("");
  const branchId = profile?.isAdminHq
    ? selectedBranch
    : (profile?.branchId ?? "");
  const branches = useBranchesList(
    { limit: 100 },
    { enabled: open && !!profile?.isAdminHq },
  );
  const categories = useGivingCategories(
    { limit: 100, branchId: branchId || undefined },
    { enabled: open && !!branchId },
  );
  const mutation = useCreateRecurringGiving();
  const paymentOptions = useRecurringPaymentOptions();
  // Automatic charges need a configured church Paystack account; when the
  // options read proves it is missing, explain before the submit fails.
  const recurringBlocked = paymentOptions.data?.recurringAvailable === false;
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [email, setEmail] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<
    "weekly" | "monthly" | "quarterly"
  >("monthly");
  useEffect(() => {
    if (!open) return;
    setSelectedBranch(initialBranchId ?? "");
    setMemberId("");
    setMemberName("");
    setEmail("");
    setCategoryId("");
    setAmount("");
    setFrequency("monthly");
  }, [open, initialBranchId]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!branchId || !memberId || !categoryId || Number(amount) < 100) {
      toast.error(
        "Choose a branch, member and category, and enter at least ₦100",
      );
      return;
    }
    try {
      await mutation.mutateAsync({
        branchId,
        memberId,
        categoryId,
        email: email.trim(),
        amount: Number(amount),
        frequency,
      });
      toast.success("Recurring giving schedule created");
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not create recurring giving", {
        description: getToastErrorMessage(error, "Please try again."),
      });
    }
  };
  const options = (categories.data?.data ?? []).filter(
    (category) => category.isActive && category.isRecurring,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${presentationClassName ?? ""} sm:max-w-[540px] max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle>Create Recurring Giving</DialogTitle>
          <DialogDescription>
            Schedule giving for a member. Automatic charges require the giver to
            complete payment authorization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {recurringBlocked ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Recurring gifts charge cards automatically, which needs a
                Paystack payment account for your church. Set one up under{" "}
                <Link
                  href="/admin/channels"
                  className="font-medium underline underline-offset-2"
                >
                  Settings → Integrations
                </Link>{" "}
                first.
              </p>
            </div>
          ) : null}
          <GivingFormSection title="Giver & branch">
            <div className="space-y-2">
              <Label>Branch</Label>
              <AvailableSelect
                unavailableMessage={
                  profile?.isAdminHq && !branches.data?.data.length
                    ? "No branches are available. Please try again later."
                    : undefined
                }
                value={branchId || undefined}
                disabled={
                  !profile?.isAdminHq ||
                  branches.isLoading ||
                  mutation.isPending
                }
                onValueChange={(value) => {
                  setSelectedBranch(value);
                  setMemberId("");
                  setMemberName("");
                  setEmail("");
                  setCategoryId("");
                }}
              >
                <SelectTrigger aria-label="Recurring giving branch">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {profile?.isAdminHq ? (
                    (branches.data?.data ?? []).map((branch) => (
                      <SelectItem key={branch.branchId} value={branch.branchId}>
                        {branch.name}
                      </SelectItem>
                    ))
                  ) : branchId ? (
                    <SelectItem value={branchId}>
                      {profile?.branch?.name ?? "Your branch"}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </AvailableSelect>
            </div>
            <div className="space-y-2">
              <Label>Member</Label>
              <MemberCombobox
                branchId={branchId || undefined}
                value={memberId}
                selectedName={memberName}
                disabled={!branchId || mutation.isPending}
                onChange={(id, member) => {
                  setMemberId(id);
                  setMemberName(
                    member ? `${member.firstName} ${member.lastName}` : "",
                  );
                  setEmail(member?.email ?? "");
                }}
              />
            </div>
          </GivingFormSection>
          <GivingFormSection title="Schedule & authorization">
            <div className="space-y-2">
              <Label>Category</Label>
              <AvailableSelect
                value={categoryId || undefined}
                onValueChange={setCategoryId}
                disabled={
                  !branchId || categories.isLoading || mutation.isPending
                }
                unavailableMessage={
                  categories.isError
                    ? "Unable to load recurring categories. Please try again."
                    : options.length === 0
                      ? "No recurring giving categories are available. Enable recurring giving on a category first."
                      : undefined
                }
              >
                <SelectTrigger aria-label="Recurring giving category">
                  <SelectValue placeholder="Select a recurring category" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((category) => (
                    <SelectItem
                      key={category.categoryId}
                      value={category.categoryId}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </AvailableSelect>
              {!categories.isLoading && branchId && options.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Enable recurring giving on a category in Giving Categories
                  first.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-email">Payer email</Label>
              <Input
                id="recurring-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-amount">Amount (NGN)</Label>
              <Input
                id="recurring-amount"
                type="number"
                min={100}
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as typeof frequency)
                }
                disabled={mutation.isPending}
              >
                <SelectTrigger aria-label="Giving frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["weekly", "monthly", "quarterly"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </GivingFormSection>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!branchId || !memberId || !categoryId || recurringBlocked}
            >
              Create Schedule
            </Button>
          </DialogFooter>
        </form>
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
