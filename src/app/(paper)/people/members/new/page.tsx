"use client";

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
        eyebrow={
          <Link href="/people/members" className="flex items-center gap-1.5 hover:text-ink">
            ← People · Members
          </Link>
        }
        title="Introduce someone new."
        description="Sixty seconds here saves a week of chasing later."
      />

      <Form {...form}>
        <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            <SectionCard eyebrow="Identity" title="Who are they?">
              <div className="grid gap-4 sm:grid-cols-2">
                <RhfField name="firstName" label="First name" required autoFocus />
                <RhfField name="lastName" label="Last name" required />
                <RhfField name="email" label="Email" type="email" />
                <RhfField name="phone" label="Phone" placeholder="(415) 555-0100" />
                <RhfField name="whatsappNumber" label="WhatsApp" placeholder="+1 415 555 0100" />
                <RhfField name="dateOfBirth" label="Birthday" type="date" />
                <SelectField name="gender" label="Gender" options={["female", "male", "unspecified"]} />
                <SelectField name="branchId" label="Branch" options={(branches.data?.data ?? []).map((b) => ({ value: b.branchId, label: b.name }))} disabled={!isHq} />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Contact & household" title="Where they are">
              <div className="grid gap-4 sm:grid-cols-2">
                <RhfField name="address" label="Address" className="sm:col-span-2" />
                <RhfField name="city" label="City" />
                <RhfField name="state" label="State" />
                <div className="space-y-1.5 sm:col-span-2">
                  <FormLabel className="text-sm">Household</FormLabel>
                  <FormField
                    control={form.control}
                    name="familyId"
                    render={({ field }) => (
                      <FormItem>
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

            <SectionCard eyebrow="Notes" title="A first word">
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

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="paper-card overflow-hidden rounded-2xl">
              <div className="border-b border-line bg-muted/30 px-4 py-3">
                <p className="rule-label">Profile preview</p>
              </div>
              <div className="space-y-4 p-4">
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
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm text-ink-soft transition-colors hover:border-brand/40">
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
            </div>
            <div className="mt-3 space-y-2">
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
            </div>
            {!canCreate && ready ? (
              <p className="mt-3 text-center text-xs text-ink-faint">Your role can view the register but not add to it.</p>
            ) : null}
          </aside>
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
}: {
  name: keyof Values;
  label: string;
  options: { value: string; label: string }[] | string[];
  disabled?: boolean;
}) {
  const form = useFormContextLike();
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <FormField required={name === "branchId" || name === "firstName" || name === "lastName"}
      control={form.control}
      name={name as never}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
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
