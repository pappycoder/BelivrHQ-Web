"use client";

import { ValidatedForm } from "@/components/ui/validated-form";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { MemberCombobox } from "@/components/members/member-combobox";
import {
  useCreateLifeEvent,
  LIFE_EVENT_TYPES,
  LIFE_EVENT_TYPE_LABELS,
  type LifeEvent,
} from "@/hooks/use-pastoral";

const lifeEventSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member"),
  type: z.enum(LIFE_EVENT_TYPES),
  date: z.string().trim().min(1, "Date is required"),
  notes: z.string(),
});

type LifeEventFormValues = z.infer<typeof lifeEventSchema>;

interface LifeEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (event: LifeEvent) => void;
}

export function LifeEventFormDialog({
  open,
  onOpenChange,
  onSaved,
}: LifeEventFormDialogProps) {
  const createMutation = useCreateLifeEvent();

  const form = useForm<LifeEventFormValues>({
    resolver: zodResolver(lifeEventSchema),
    defaultValues: {
      memberId: "",
      type: "birthday",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        memberId: "",
        type: "birthday",
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = (values: LifeEventFormValues) => {
    const notes = values.notes.trim();
    createMutation.mutate(
      {
        memberId: values.memberId,
        type: values.type,
        date: values.date,
        details: notes ? { notes } : undefined,
      },
      {
        onSuccess: (saved) => {
          toast.success("Life event added successfully");
          onOpenChange(false);
          onSaved?.(saved);
        },
        onError: (error) => {
          toast.error("Failed to add life event", {
            description: error?.message || "Please try again.",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Life Event</DialogTitle>
          <DialogDescription>
            Record an important milestone for a member.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Member and event">
              <FormField required
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    <FormControl>
                      <MemberCombobox
                        value={field.value}
                        onChange={(memberId) => field.onChange(memberId)}
                        placeholder="Search and select a member"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField required
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LIFE_EVENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {LIFE_EVENT_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField required
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input picker="wheel" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Additional information">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional details about this event"
                        rows={3}
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
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                loading={createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Add Life Event"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
