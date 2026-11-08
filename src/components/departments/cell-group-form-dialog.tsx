"use client";
import { WorkspaceFormSection } from "@/components/workspace/workspace-presentation";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberCombobox } from "@/components/members/member-combobox";
import { useBranchesList } from "@/hooks/use-branches";
import {
  MEETING_DAYS,
  useCreateCellGroup,
  useUpdateCellGroup,
  type CellGroup,
} from "@/hooks/use-admin";

const cellGroupSchema = z.object({
  name: z.string().min(1, "Cell group name is required").max(100),
  branchId: z.string().optional(),
  leaderId: z.string().optional(),
  address: z
    .string()
    .max(200, "Address must be 200 characters or less")
    .optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  latitude: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= -90 && Number(v) <= 90),
      {
        message: "Latitude must be between -90 and 90",
      },
    ),
  longitude: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= -180 && Number(v) <= 180),
      {
        message: "Longitude must be between -180 and 180",
      },
    ),
});

type CellGroupFormValues = z.infer<typeof cellGroupSchema>;

interface CellGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  group?: CellGroup | null;
  onSaved?: (group: CellGroup) => void;
  /** When set, the branch + leader fields are locked (read-only) and dropped from the submit payload. */
  lockedLeaderBranch?: boolean;
}

function toFormValues(group?: CellGroup | null): CellGroupFormValues {
  return {
    name: group?.name ?? "",
    branchId: group?.branchId ?? "",
    leaderId: group?.leaderId ?? "",
    address: group?.address ?? "",
    meetingDay: group?.meetingDay ?? "",
    meetingTime: group?.meetingTime ?? "",
    latitude: group?.latitude != null ? String(group.latitude) : "",
    longitude: group?.longitude != null ? String(group.longitude) : "",
  };
}

export function CellGroupFormDialog({
  open,
  onOpenChange,
  returnFocusRef,
  group,
  onSaved,
  lockedLeaderBranch = false,
}: CellGroupFormDialogProps) {
  const isEdit = !!group;
  const createMutation = useCreateCellGroup();
  const updateMutation = useUpdateCellGroup(group?.id ?? "");
  const { data: branchesData } = useBranchesList({ limit: 100 });

  const form = useForm<CellGroupFormValues>({
    resolver: zodResolver(cellGroupSchema),
    defaultValues: toFormValues(group),
  });

  const [leaderName, setLeaderName] = React.useState("");

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(group));
      setLeaderName(
        group
          ? [group.leaderFirstName, group.leaderLastName]
              .filter(Boolean)
              .join(" ")
          : "",
      );
    }
  }, [open, group, form]);

  const onSubmit = (values: CellGroupFormValues) => {
    const payload = {
      name: values.name.trim(),
      branchId:
        lockedLeaderBranch || !values.branchId?.trim()
          ? undefined
          : values.branchId.trim(),
      leaderId:
        lockedLeaderBranch || !values.leaderId?.trim()
          ? undefined
          : values.leaderId.trim(),
      address: values.address?.trim() || undefined,
      meetingDay: values.meetingDay?.trim() || undefined,
      meetingTime: values.meetingTime?.trim() || undefined,
      latitude: values.latitude ? Number(values.latitude) : undefined,
      longitude: values.longitude ? Number(values.longitude) : undefined,
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload, {
      onSuccess: (saved) => {
        toast.success(
          isEdit
            ? "Cell group updated successfully"
            : "Cell group created successfully",
        );
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => {
        toast.error(
          isEdit
            ? "Failed to update cell group"
            : "Failed to create cell group",
          {
            description: error?.message || "Please try again.",
          },
        );
      },
    });
  };

  const branches = branchesData?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={
          returnFocusRef
            ? (event) => {
                const target = returnFocusRef.current;
                if (target?.isConnected) {
                  event.preventDefault();
                  requestAnimationFrame(() => target.focus());
                }
              }
            : undefined
        }
        className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Cell Group" : "Add Cell Group"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this cell group's details."
              : "Create a small community cell group."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Identity and leadership">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Victory Cell Group" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={lockedLeaderBranch}
                      >
                        <FormControl>
                          <SelectTrigger disabled={lockedLeaderBranch}>
                            <SelectValue placeholder="No branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.branchId} value={b.branchId}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leaderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leader</FormLabel>
                      <FormControl>
                        <MemberCombobox
                          value={field.value ?? ""}
                          onChange={(id, member) => {
                            field.onChange(id);
                            setLeaderName(
                              member
                                ? `${member.firstName} ${member.lastName}`
                                : "",
                            );
                          }}
                          selectedName={leaderName}
                          placeholder="Select leader..."
                          disabled={lockedLeaderBranch}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Meeting schedule">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="meetingDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Day</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MEETING_DAYS.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meetingTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Time</FormLabel>
                      <FormControl>
                        <Input picker="wheel" type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        Local group meeting time (HH:MM).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Location">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 14 Opebi Road, Ikeja, Lagos"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Where the group meets.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 6.5244" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 3.3792" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription className="-mt-2">
                Coordinates power the near-you recommendations for mobile
                members.
              </FormDescription>
            </WorkspaceFormSection>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Cell Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
