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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useCreatePastoralNote,
  useUpdatePastoralNote,
  type PastoralNote,
  type ConfidentialityLevel,
} from "@/hooks/use-pastoral";

const noteSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member"),
  content: z.string().trim().min(1, "Note content is required"),
  confidentiality: z.enum(["standard", "confidential", "restricted"]),
  tags: z.string(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

const CONFIDENTIALITY_OPTIONS: Array<{
  value: ConfidentialityLevel;
  label: string;
  description: string;
}> = [
  {
    value: "standard",
    label: "Standard",
    description: "Visible to any staff member",
  },
  {
    value: "confidential",
    label: "Confidential",
    description: "Only pastors and leaders",
  },
  {
    value: "restricted",
    label: "Restricted",
    description: "Very few staff members",
  },
];

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this note; otherwise it creates one. */
  note?: PastoralNote | null;
  onSaved?: (note: PastoralNote) => void;
}

function toFormValues(note?: PastoralNote | null): NoteFormValues {
  return {
    memberId: note?.memberId ?? "",
    content: note?.content ?? "",
    confidentiality: note?.confidentiality ?? "standard",
    tags: (note?.tags ?? []).join(", "),
  };
}

export function NoteFormDialog({
  open,
  onOpenChange,
  note,
  onSaved,
}: NoteFormDialogProps) {
  const isEdit = !!note;
  const createMutation = useCreatePastoralNote();
  const updateMutation = useUpdatePastoralNote(note?.id ?? "");

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: toFormValues(note),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(note));
    }
  }, [open, note, form]);

  const onSubmit = (values: NoteFormValues) => {
    const tags = values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const mutation = isEdit ? updateMutation : createMutation;

    mutation.mutate(
      (isEdit
        ? {
            content: values.content.trim(),
            confidentiality: values.confidentiality,
            tags,
          }
        : {
            memberId: values.memberId,
            content: values.content.trim(),
            confidentiality: values.confidentiality,
            tags: tags.length ? tags : undefined,
          }) as never,
      {
        onSuccess: (saved) => {
          toast.success(
            isEdit ? "Note updated successfully" : "Note added successfully",
          );
          onOpenChange(false);
          onSaved?.(saved);
        },
        onError: (error) => {
          toast.error(isEdit ? "Failed to update note" : "Failed to add note", {
            description: error?.message || "Please try again.",
          });
        },
      },
    );
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Note" : "Add Note"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this pastoral care note."
              : "Record a pastoral note about a member."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Member and note">
              <FormField required
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    {isEdit && note ? (
                      <div className="flex h-10 items-center rounded-md border border-transparent bg-gray-50 px-3 py-2 text-sm">
                        {note.memberFirstName} {note.memberLastName}
                      </div>
                    ) : (
                      <FormControl>
                        <MemberCombobox
                          value={field.value}
                          onChange={(memberId) => field.onChange(memberId)}
                          placeholder="Search and select a member"
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField required
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What happened, what was discussed, and any follow-up needed..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Access and organization">
              <FormField required
                control={form.control}
                name="confidentiality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidentiality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONFIDENTIALITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {
                        CONFIDENTIALITY_OPTIONS.find(
                          (opt) => opt.value === field.value,
                        )?.description
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. visit, follow-up, counseling (comma separated)"
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
                {pending
                  ? isEdit
                    ? "Saving..."
                    : "Adding..."
                  : isEdit
                    ? "Save Changes"
                    : "Add Note"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
