"use client";

import { FormActions } from "@/components/shared/form-actions";

import { CREATE_FORM_LAYOUT, CreatePreviewCard, CreatePreviewSidebar } from "@/components/shared/create-preview";


import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { PersonAvatar } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
 FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CustomFieldsEditor,
  type CustomFieldRow,
  rowsToCustomFields,
} from "@/components/members/custom-fields-editor";
import { FamilyCombobox } from "@/components/members/family-combobox";
import { useBranchesList } from "@/hooks/use-branches";
import { useCreateMember } from "@/hooks/use-members";
import { useFamiliesList, useAddFamilyMember } from "@/hooks/use-families";
import { useCurrentProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";

const MAX_PHOTO_MB = 5;

const NEW_MEMBER_TOUR_STEPS: TourStep[] = [
  { target: ".new-member-tour-heading", title: "Introduce a new member", description: "Use this form to create a member record directly. Fields marked with an asterisk are required. This guide explains the form without entering information or saving a member." },
  { target: ".new-member-tour-name", title: "Start with their name", description: "First name and Last name are both required. Enter the person's details after the tour. The profile preview updates as you type, so you can check how the name will appear." },
  { target: ".new-member-tour-contact", title: "Add contact details", description: "Email, Phone and WhatsApp are optional. Enter an email address in a valid format if you supply one, and include the country code when useful for phone numbers. Leave unavailable details blank." },
  { target: ".new-member-tour-birthday", title: "Personal details are optional", description: "Choose Birthday and Gender if those details are available. You can leave them blank and continue. Check the date carefully before saving." },
  { target: ".new-member-tour-branch", title: "Check the member's branch", description: "A branch is required. HQ accounts can select one from the available branches; branch accounts use their assigned branch and cannot change it here. Check this before creating the record." },
  { target: ".new-member-tour-address", title: "Record their location", description: "Address, City and State are optional. Add the details you have, or leave them blank. These fields do not replace the required branch assignment." },
  { target: ".new-member-tour-household", title: "Link an existing household", description: "Household is optional. Select an existing family to reveal Relationship and Head of household controls. Set those only if appropriate. Creating the member and linking the household are separate operations; a warning will tell you if the link needs attention." },
  { target: ".new-member-tour-custom > div:first-child", title: "Add other useful details", description: "Add field creates a label-and-value pair for an extra detail. Supply a distinct label for each entry. Entries without a label are ignored, and a repeated label keeps the last value. You can remove a row before saving." },
  { target: ".new-member-tour-notes", title: "Add a note if needed", description: "Use Notes for relevant context that helps your team care for this member. This is optional and is saved with the member record." },
  { target: ".new-member-tour-preview", title: "Check the profile preview", description: "The preview reflects the name, email and selected photo from this form. It helps you review the entry; it does not mean the member has been saved." },
  { target: ".new-member-tour-photo", title: "Choose an optional photo", description: "Add a photo accepts an image up to 5 MB. A selected photo can be replaced or removed before saving. Upload happens after the member is created; if it fails, the member is still saved and you will see a warning." },
  { target: ".new-member-tour-save", title: "Save only when you are ready", description: "Create member validates the form and saves a new record when the required details are valid. Review any field errors and try again. Cancel returns to the directory and asks before discarding changed form fields. Finishing this tour does not submit the form." },
];

const RELATIONSHIP_OPTIONS = ["spouse", "child", "parent", "sibling", "ward", "other"];

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  branchId: z.string().trim().min(1, "Select a branch"),
  notes: z.string().optional(),
  familyId: z.string().optional(),
  familyRelationship: z.string().optional(),
  isFamilyHead: z.boolean().optional(),
});

type Values = z.infer<typeof schema>;

export default function NewMemberPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const branches = useBranchesList({ limit: 100 });
  const createMember = useCreateMember();
  useFamiliesList({ limit: 20 });

  const [customRows, setCustomRows] = React.useState<CustomFieldRow[]>([]);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState("");
  const [familyName, setFamilyName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", whatsappNumber: "",
      gender: "", dateOfBirth: "", address: "", city: "", state: "",
      branchId: "",
      notes: "", familyId: "", familyRelationship: "", isFamilyHead: false,
    },
  });

  React.useEffect(() => {
    if (profile?.branchId && !form.getValues("branchId")) form.setValue("branchId", profile.branchId);
  }, [profile?.branchId, form]);

  React.useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const canCreate = ready && (can("members:new", "create") || can("members:all", "create"));

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) { toast.error(`Image must be ${MAX_PHOTO_MB} MB or smaller`); return; }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const addFamilyMember = useAddFamilyMember(form.watch("familyId") ?? "");

  const onSubmit = async (values: Values) => {
    setSaving(true);
    try {
      const member = await createMember.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        whatsappNumber: values.whatsappNumber?.trim() || undefined,
        gender: values.gender || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        address: values.address?.trim() || undefined,
        city: values.city?.trim() || undefined,
        state: values.state?.trim() || undefined,
        branchId: values.branchId || undefined,
        notes: values.notes?.trim() || undefined,
        customFields: rowsToCustomFields(customRows),
      });

      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append("file", photoFile);
          fd.append("folder", "members");
          const uploaded = await api.post<{ url: string }>("/media/upload/image", fd);
          await api.patch(`/members/${member.memberId}`, { photoUrl: uploaded.url });
        } catch {
          toast.warning("The member was saved, but the photo upload failed. You can add it later.", { duration: 6000 });
        }
      }

      if (values.familyId) {
        try {
          await addFamilyMember.mutateAsync({
            memberId: member.memberId,
            relationship: values.familyRelationship || "member",
            isHead: !!values.isFamilyHead,
          });
        } catch {
          toast.warning(`${member.firstName} was created, but wasn't linked to ${familyName}. Link them from the household page.`, { duration: 6000 });
        }
      }

      toast.success(`${member.firstName} ${member.lastName} joined the family.`);
      router.push(`/people/members/${member.memberId}`);
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Couldn't save the member. Please try again."));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        className="new-member-tour-heading"
        actions={<PageTour page="Add a member" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && canCreate && !saving} steps={NEW_MEMBER_TOUR_STEPS} />}
        eyebrow={
          <Link href="/people/members" className="flex items-center gap-1.5 hover:text-ink">
            ← People · Members
          </Link>
        }
        title="Introduce someone new."
        description="Sixty seconds here saves a week of chasing later."
      />

      <Form {...form}>
        <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className={CREATE_FORM_LAYOUT}>
          <div className="min-w-0 space-y-4">
            <SectionCard eyebrow="Identity" title="Who are they?">
              <div className="grid gap-4 sm:grid-cols-2">
                <RhfField name="firstName" label="First name" className="new-member-tour-name" required autoFocus />
                <RhfField name="lastName" label="Last name" required />
                <RhfField name="email" label="Email" className="new-member-tour-contact" type="email" />
                <RhfField name="phone" label="Phone" placeholder="(415) 555-0100" />
                <RhfField name="whatsappNumber" label="WhatsApp" placeholder="+1 415 555 0100" />
                <RhfField name="dateOfBirth" label="Birthday" className="new-member-tour-birthday" type="date" />
                <SelectField name="gender" label="Gender" options={["female", "male", "unspecified"]} />
                <SelectField name="branchId" label="Branch" className="new-member-tour-branch" options={(branches.data?.data ?? []).map((b) => ({ value: b.branchId, label: b.name }))} disabled={!isHq} />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Contact & household" title="Where they are">
              <div className="grid gap-4 sm:grid-cols-2">
                <RhfField name="address" label="Address" className="new-member-tour-address sm:col-span-2" />
                <RhfField name="city" label="City" />
                <RhfField name="state" label="State" />
                <div className="new-member-tour-household space-y-1.5 sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="familyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Household</FormLabel>
                        <FormControl>
                          <FamilyCombobox
                            value={field.value ?? ""}
                            selectedName={familyName}
                            placeholder="Link to a family (optional)"
                            onChange={(familyId, family) => {
                              field.onChange(familyId);
                              setFamilyName(family?.name ?? "");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("familyId") ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField name="familyRelationship" label="Relationship" options={RELATIONSHIP_OPTIONS} />
                      <FormField
                        control={form.control}
                        name="isFamilyHead"
                        render={({ field }) => (
                          <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
                            <span className="text-sm">Head of household</span>
                            <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                          </div>
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              className="new-member-tour-custom"
              eyebrow="Their story"
              title="Custom fields"
              description="Useful details such as a nickname, shift pattern or dietary requirement."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full border-line text-sm"
                  onClick={() => setCustomRows((rows) => [...rows, { key: "", value: "" }])}
                >
                  Add field
                </Button>
              }
            >
              {customRows.length ? (
                <CustomFieldsEditor rows={customRows} onChange={setCustomRows} />
              ) : (
                <p className="text-sm text-ink-faint">Nothing yet. Add one if it matters.</p>
              )}
            </SectionCard>

            <SectionCard className="new-member-tour-notes" eyebrow="Notes" title="A first word">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea rows={3} placeholder="How they came to us, what they're carrying…" className="resize-none rounded-lg border-line bg-card text-sm shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SectionCard>
          </div>

          <CreatePreviewSidebar>
            <CreatePreviewCard className="new-member-tour-preview" eyebrow="Profile preview" title={`${form.watch("firstName")} ${form.watch("lastName")}`.trim() || "New member"}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="" className="size-14 rounded-full object-cover" />
                  ) : (
                    <PersonAvatar
                      name={`${form.watch("firstName")} ${form.watch("lastName")}`.trim() || "New"}
                      size="lg"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {form.watch("firstName") || "First"} {form.watch("lastName") || "name"}
                    </p>
                    <p className="truncate text-sm text-ink-faint">{form.watch("email") || "no email yet"}</p>
                  </div>
                </div>
                <label className="new-member-tour-photo flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm text-ink-soft transition-colors hover:border-brand/40">
                  {photoPreview ? <Camera className="size-3.5" /> : <ImagePlus className="size-3.5" />}
                  {photoPreview ? "Replace photo" : "Add a photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickPhoto(e.target.files?.[0])}
                  />
                </label>
                {photoPreview ? (
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(""); }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-rose hover:bg-rose-soft"
                  >
                    <Trash2 className="size-3" /> Remove photo
                  </button>
                ) : null}
                {familyName ? <p className="text-sm text-ink-soft">Household: <span className="font-medium">{familyName}</span></p> : null}
              </div>
            </CreatePreviewCard>
            <FormActions className="new-member-tour-save">
              <Button type="submit" disabled={saving || !canCreate} className="h-10 w-full rounded-lg text-sm">
                {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Adding…</> : "Create member"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-full rounded-lg text-sm text-ink-soft"
                onClick={async () => {
                  if (form.formState.isDirty && !(await confirmDiscardChanges())) return;
                  router.push("/people/members");
                }}
              >
                Cancel
              </Button>
            </FormActions>
            {!canCreate && ready ? (
              <p className="mt-3 text-center text-xs text-ink-faint">Your role can view the register but not add to it.</p>
            ) : null}
          </CreatePreviewSidebar>
        </ValidatedForm>
      </Form>
    </div>
  );
}

function RhfField({
  name,
  label,
  type = "text",
  placeholder,
  autoFocus,
  className,
}: {
  name: keyof Values;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const form = useFormContextLike();
  return (
    <FormField required={name === "branchId" || name === "firstName" || name === "lastName"}
      control={form.control}
      name={name as never}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-sm">{label}</FormLabel>
          <FormControl>
            <Input picker="wheel"
              type={type}
              autoFocus={autoFocus}
              placeholder={placeholder}
              className="h-10 rounded-lg border-line bg-card text-sm shadow-none"
              {...field}
              value={(field.value as string | undefined) ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField({
  name,
  label,
  options,
  disabled,
  className,
}: {
  name: keyof Values;
  label: string;
  options: { value: string; label: string }[] | string[];
  disabled?: boolean;
  className?: string;
}) {
  const form = useFormContextLike();
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <FormField required={name === "branchId" || name === "firstName" || name === "lastName"}
      control={form.control}
      name={name as never}
      render={({ field }) => (
        <FormItem className={`space-y-1.5 ${className ?? ""}`}>
          <FormLabel className="text-sm">{label}</FormLabel>
          <Select
            disabled={disabled}
            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
            value={(field.value as string) || "__none__"}
          >
            <FormControl>
              <SelectTrigger className="h-10 rounded-lg border-line bg-card text-sm shadow-none">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// useFormContext wrapper to avoid prop-drilling inside the file
function useFormContextLike() {
  return useFormContext<Values>();
}
