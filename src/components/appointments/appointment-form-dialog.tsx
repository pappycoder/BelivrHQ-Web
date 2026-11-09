"use client";
import { WorkspaceFormSection } from "@/components/workspace/workspace-presentation";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { Loader2, UserPlus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactCombobox } from "@/components/shared/contact-combobox";
import { VisitorCombobox } from "@/components/visitors/visitor-combobox";
import { useCreateVisitor } from "@/hooks/use-visitors";
import {
  useCreateAppointment,
  useUpdateAppointment,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type Appointment,
  type AppointmentContact,
  type AppointmentMutationInput,
  type AppointmentWhoKind,
} from "@/hooks/use-appointments";

const APPOINTMENT_SCHEMA = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    scheduledAt: z.string().min(1, "Date and time are required"),
    withId: z.string().min(1, "Select a pastor (With)"),
    whoKind: z.enum(["profile", "visitor"]),
    whoId: z.string().optional(),
    visitorId: z.string().optional(),
    location: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    status: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.whoKind === "profile" && !v.whoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whoId"],
        message: "Select a person (Who)",
      });
    }
    if (v.whoKind === "visitor" && !v.visitorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visitorId"],
        message: "Select a visitor (Who)",
      });
    }
  });

type AppointmentFormValues = z.infer<typeof APPOINTMENT_SCHEMA>;

function toLocalDatetime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(datetime: string): string {
  const d = new Date(datetime);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this appointment; otherwise it creates one. */
  appointment?: Appointment | null;
  onSaved?: () => void;
}

/** Prefill the form from an existing appointment. */
function toFormValues(appointment?: Appointment | null): AppointmentFormValues {
  const whoKind: AppointmentWhoKind = appointment?.whoKind ?? "profile";
  return {
    title: appointment?.title ?? "",
    scheduledAt: toLocalDatetime(appointment?.scheduledAt),
    withId: appointment?.pastorId ?? "",
    whoKind,
    whoId: whoKind === "profile" ? (appointment?.personId ?? "") : "",
    visitorId: whoKind === "visitor" ? (appointment?.visitorId ?? "") : "",
    location: appointment?.location ?? "",
    notes: appointment?.notes ?? "",
    status: appointment?.status ?? "pending",
  };
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  onSaved,
}: AppointmentFormDialogProps) {
  const isEdit = !!appointment;
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const createVisitor = useCreateVisitor();

  const [whoTab, setWhoTab] = React.useState<"profile" | "visitor" | "new">(
    "profile",
  );
  const [newVisitor, setNewVisitor] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(APPOINTMENT_SCHEMA),
    defaultValues: toFormValues(appointment),
  });

  const visitorId = form.watch("visitorId");

  React.useEffect(() => {
    if (open) {
      setWhoTab("profile");
      setNewVisitor({ firstName: "", lastName: "", phone: "", email: "" });
      form.reset(toFormValues(appointment));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment]);

  const pickWith = (contact: AppointmentContact) => {
    form.setValue("withId", contact.id, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const pickWhoProfile = (contact: AppointmentContact) => {
    form.setValue("whoKind", "profile", {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("whoId", contact.id, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("visitorId", "", { shouldDirty: true });
  };

  const pickWhoVisitor = (visitorIdValue: string) => {
    form.setValue("whoKind", "visitor", {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("visitorId", visitorIdValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("whoId", "", { shouldDirty: true });
  };

  const handleVisitorChange = (id: string) => {
    if (id) pickWhoVisitor(id);
    else clearWho();
  };

  const clearWho = () => {
    form.setValue("whoId", "", { shouldValidate: true, shouldDirty: true });
    form.setValue("visitorId", "", { shouldValidate: true, shouldDirty: true });
  };

  const submitNewVisitor = () => {
    if (!newVisitor.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    createVisitor.mutate(
      {
        firstName: newVisitor.firstName.trim(),
        lastName: newVisitor.lastName?.trim() || undefined,
        phone: newVisitor.phone?.trim() || undefined,
        email: newVisitor.email?.trim() || undefined,
      },
      {
        onSuccess: (visitor) => {
          pickWhoVisitor(visitor.id);
          setWhoTab("visitor");
          setNewVisitor({ firstName: "", lastName: "", phone: "", email: "" });
          toast.success(
            `Visitor ${visitor.firstName} ${visitor.lastName ?? ""}`.trim() +
              " added",
          );
        },
        onError: (e) =>
          toast.error("Failed to create visitor", {
            description: getToastErrorMessage(e, "Please try again."),
          }),
      },
    );
  };

  const onSubmit = (values: AppointmentFormValues) => {
    const payload = {
      title: values.title.trim(),
      scheduledAt: toIso(values.scheduledAt),
      withId: values.withId,
      location: values.location?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };

    if (isEdit && appointment) {
      const input: Partial<AppointmentMutationInput> = {
        ...payload,
        status: values.status,
      };
      if (values.withId && values.withId !== appointment.pastorId) {
        input.withId = values.withId;
      }
      if (
        values.whoKind !== appointment.whoKind ||
        values.whoId !== appointment.personId ||
        values.visitorId !== appointment.visitorId
      ) {
        input.whoKind = values.whoKind;
        if (values.whoKind === "visitor") {
          input.visitorId = values.visitorId;
        } else {
          input.whoId = values.whoId;
        }
      }
      updateMutation.mutate(
        { id: appointment.id, input },
        {
          onSuccess: () => {
            toast.success("Appointment updated");
            onOpenChange(false);
            onSaved?.();
          },
          onError: (e) =>
            toast.error("Failed to update appointment", {
              description: getToastErrorMessage(e, "Please try again."),
            }),
        },
      );
      return;
    }

    const input: AppointmentMutationInput = {
      ...payload,
      status: values.status || "pending",
      whoKind: values.whoKind,
      ...(values.whoKind === "visitor"
        ? { visitorId: values.visitorId }
        : { whoId: values.whoId }),
    };
    createMutation.mutate(input, {
      onSuccess: () => {
        toast.success("Appointment booked");
        onOpenChange(false);
        onSaved?.();
      },
      onError: (e) =>
        toast.error("Failed to book appointment", {
          description: getToastErrorMessage(e, "Please try again."),
        }),
    });
  };

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    createVisitor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this appointment's details."
              : "Book a meeting in the registry."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* With pastor picker */}
            <WorkspaceFormSection title="People">
              <FormField
                control={form.control}
                name="withId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>With (Pastor) *</FormLabel>
                    <FormControl>
                      <ContactCombobox
                        kind="with"
                        value={field.value}
                        onSelect={pickWith}
                        placeholder="Search by name, role, or branch…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Who party picker */}
              <FormField
                control={form.control}
                name="whoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Who (Person / Visitor) *</FormLabel>
                    <FormControl>
                      <Tabs
                        value={whoTab}
                        onValueChange={(v) => {
                          setWhoTab(v as "profile" | "visitor" | "new");
                          if (v === "visitor" && !visitorId) {
                            pickWhoVisitor("");
                          }
                        }}
                      >
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
                          <TabsTrigger value="profile">Person</TabsTrigger>
                          <TabsTrigger value="visitor">Visitor</TabsTrigger>
                          {!isEdit && (
                            <TabsTrigger value="new">New Visitor</TabsTrigger>
                          )}
                        </TabsList>

                        <TabsContent value="profile" className="pt-3 space-y-2">
                          <ContactCombobox
                            kind="who"
                            value={field.value ?? ""}
                            onSelect={pickWhoProfile}
                            placeholder="Search staff or members…"
                          />
                        </TabsContent>

                        <TabsContent value="visitor" className="pt-3 space-y-2">
                          <VisitorCombobox
                            value={visitorId ?? ""}
                            onChange={(id) => handleVisitorChange(id)}
                            placeholder="Search existing visitors…"
                          />
                        </TabsContent>

                        {!isEdit && (
                          <TabsContent value="new" className="pt-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="apmt-new-first">
                                  First Name *
                                </Label>
                                <Input
                                  id="apmt-new-first"
                                  placeholder="First name"
                                  value={newVisitor.firstName}
                                  onChange={(e) =>
                                    setNewVisitor({
                                      ...newVisitor,
                                      firstName: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="apmt-new-last">Last Name</Label>
                                <Input
                                  id="apmt-new-last"
                                  placeholder="Last name"
                                  value={newVisitor.lastName}
                                  onChange={(e) =>
                                    setNewVisitor({
                                      ...newVisitor,
                                      lastName: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="apmt-new-phone">Phone</Label>
                                <Input
                                  id="apmt-new-phone"
                                  placeholder="+234..."
                                  value={newVisitor.phone}
                                  onChange={(e) =>
                                    setNewVisitor({
                                      ...newVisitor,
                                      phone: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="apmt-new-email">Email</Label>
                                <Input
                                  id="apmt-new-email"
                                  type="email"
                                  placeholder="name@example.com"
                                  value={newVisitor.email}
                                  onChange={(e) =>
                                    setNewVisitor({
                                      ...newVisitor,
                                      email: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={submitNewVisitor}
                              disabled={createVisitor.isPending}
                            >
                              {createVisitor.isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <UserPlus className="size-4" />
                              )}
                              Create Visitor &amp; Use
                            </Button>
                          </TabsContent>
                        )}
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Appointment details">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Budget planning" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scheduled date/time */}
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & time *</FormLabel>
                    <FormControl>
                      <Input picker="wheel" type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Main Campus, Office 2"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status (edit only) */}
              {isEdit && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {APPOINTMENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {APPOINTMENT_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        pending · confirmed · completed · cancelled
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Notes */}
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Additional information">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose / notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="What is this appointment about?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isEdit ? "Save Changes" : "Book Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
