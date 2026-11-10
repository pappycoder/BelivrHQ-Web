"use client";

import { ValidatedForm } from "@/components/ui/validated-form";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

import { ContentImage } from "@/components/shared/content-image";

/**
 * @file General Settings tab content — one merged "Church" section (logo
 * upload tile plus a single form where Church Name/Denomination are locked
 * and the public contact/location fields are editable), the unified Email
 * row and regional Preferences. Rendered inside the settings shell.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { AlertCircle, Building2, ImagePlus, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FieldRow, InfoField, SettingsSection } from "@/components/settings/ui";
import {
  CountrySelectField,
  StateSelectField,
} from "@/components/shared/country-state-select";
import {
  useChurch,
  useChurchConfig,
  useUpdateChurch,
  useUpdateChurchConfig,
  useUpdateChurchEmail,
  uploadChurchLogo,
  type ChurchProfile,
} from "@/hooks/use-church";
import { usePermissions } from "@/hooks/use-permissions";

const useCanManageChurchSettings = () => usePermissions().can("church_settings", "update");

const TIMEZONES = [
  { value: "Africa/Lagos", label: "(GMT+1) Lagos" },
  { value: "Africa/Accra", label: "(GMT+0) Accra" },
  { value: "Africa/Nairobi", label: "(GMT+3) Nairobi" },
  { value: "Africa/Johannesburg", label: "(GMT+2) Johannesburg" },
  { value: "Africa/Cairo", label: "(GMT+2) Cairo" },
  { value: "Europe/London", label: "(GMT+0) London" },
  { value: "Europe/Paris", label: "(GMT+1) Paris" },
  { value: "America/New_York", label: "(GMT-5) New York" },
  { value: "America/Chicago", label: "(GMT-6) Chicago" },
  { value: "America/Los_Angeles", label: "(GMT-8) Los Angeles" },
  { value: "Asia/Dubai", label: "(GMT+4) Dubai" },
  { value: "Asia/Kolkata", label: "(GMT+5:30) Kolkata" },
  { value: "UTC", label: "(UTC) Coordinated Universal Time" },
];

const CURRENCIES = [
  { value: "NGN", label: "NGN: Nigerian Naira (₦)" },
  { value: "USD", label: "USD: US Dollar ($)" },
  { value: "GBP", label: "GBP: British Pound (£)" },
  { value: "EUR", label: "EUR: Euro (€)" },
  { value: "GHS", label: "GHS: Ghanaian Cedi (₵)" },
  { value: "ZAR", label: "ZAR: South African Rand (R)" },
  { value: "KES", label: "KES: Kenyan Shilling (KSh)" },
  { value: "CAD", label: "CAD: Canadian Dollar (C$)" },
];

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// ─── Church (branding tile + identity/contact form) ─────────

const churchFormSchema = z.object({
  name: z.string().trim().min(1, "Church name is required"),
  denomination: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().trim().min(1, "Country is required"),
});

type ChurchFormValues = z.infer<typeof churchFormSchema>;

function churchDefaults(church: ChurchProfile): ChurchFormValues {
  return {
    name: church.name,
    denomination: church.denomination ?? "",
    phone: church.phone ?? "",
    website: church.website ?? "",
    address: church.address ?? "",
    city: church.city ?? "",
    state: church.state ?? "",
    country: church.country ?? "",
  };
}

function LogoTile({ church }: { church: ChurchProfile }) {
  const canManage = useCanManageChurchSettings();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateChurch();

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }

    try {
      const url = await uploadChurchLogo(file);
      updateMutation.mutate(
        { logoUrl: url },
        {
          onSuccess: () => toast.success("Church logo updated."),
          onError: (err: Error) => toast.error(err.message),
        },
      );
    } catch (err) {
      toast.error((err as Error).message || "Upload failed.");
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg bg-muted/60 p-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-border bg-background">
        {church.logoUrl ? (
          <ContentImage
            src={church.logoUrl}
            alt={church.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Building2 className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <h4 className="mb-1 text-sm font-medium">Church Logo</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Recommended image size is 160px x 160px · PNG or JPG, up to 5 MB.
        </p>
        {canManage && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                  {church.logoUrl ? "Change" : "Upload"}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ChurchSection({ church }: { church: ChurchProfile }) {
  const canManage = useCanManageChurchSettings();
  const updateMutation = useUpdateChurch();

  const form = useForm<ChurchFormValues>({
    resolver: zodResolver(churchFormSchema),
    defaultValues: churchDefaults(church),
  });

  React.useEffect(() => {
    if (!form.formState.isDirty) form.reset(churchDefaults(church));
  }, [church, form]);

  const handleSave = (values: ChurchFormValues) => {
    const payload: Record<string, string> = {};
    const current = churchDefaults(church);
    for (const key of Object.keys(values) as (keyof ChurchFormValues)[]) {
      if ((values[key] ?? "") !== (current[key] ?? "")) {
        payload[key] = values[key] ?? "";
      }
    }

    if (Object.keys(payload).length === 0) return;

    updateMutation.mutate(payload, {
      onSuccess: () => toast.success("Church information updated."),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const disabled = !canManage || updateMutation.isPending;
  const locked = true; // Name/Denomination are fixed at registration.

  return (
    <SettingsSection id="church" title="Church">
      <LogoTile church={church} />
      <Form {...form}>
        <ValidatedForm schemaValidation onSubmit={form.handleSubmit(handleSave)}>
          <p className="-mt-1 mb-4 text-xs text-muted-foreground">
            The church name and denomination are set at registration; contact
            and location details are editable below.
          </p>
          <div className="grid gap-x-8 lg:grid-cols-2">
            <div>
              <InfoField
                label="Church Name"
                name="name"
                control={form.control}
                disabled={disabled || locked}
              />
              <InfoField
                label="Denomination"
                name="denomination"
                control={form.control}
                placeholder="e.g. Pentecostal"
                disabled={disabled || locked}
              />
              <InfoField
                label="Phone"
                name="phone"
                control={form.control}
                placeholder="+234 803 456 7890"
                disabled={disabled}
              />
              <InfoField
                label="Website"
                name="website"
                control={form.control}
                placeholder="https://church.com"
                disabled={disabled}
              />
            </div>
            <div className="mt-3 lg:mt-0">
              <InfoField
                label="Address"
                name="address"
                control={form.control}
                placeholder="12 Marina Road"
                disabled={disabled}
              />
              <InfoField
                label="City"
                name="city"
                control={form.control}
                disabled={disabled}
              />
              <StateSelectField
                label="State"
                name="state"
                countryName="country"
                control={form.control}
                disabled={disabled}
                variant="info"
              />
              <CountrySelectField
                label="Country"
                name="country"
                control={form.control}
                disabled={disabled}
                variant="info"
              />
            </div>
          </div>
          {canManage && (
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset(churchDefaults(church))}
                disabled={updateMutation.isPending || !form.formState.isDirty}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isDirty}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </ValidatedForm>
      </Form>
    </SettingsSection>
  );
}

// ─── Email (unified: sign-in + profile + church) ────────────

const churchEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ChurchEmailFormValues = z.infer<typeof churchEmailSchema>;

function EmailSection({ church }: { church: ChurchProfile }) {
  const canManage = useCanManageChurchSettings();
  const [open, setOpen] = React.useState(false);
  const updateMutation = useUpdateChurchEmail();

  const form = useForm<ChurchEmailFormValues>({
    resolver: zodResolver(churchEmailSchema),
    defaultValues: { email: church.email ?? "" },
  });

  React.useEffect(() => {
    if (!open) form.reset({ email: church.email ?? "" });
  }, [open, church, form]);

  const handleSubmit = (values: ChurchEmailFormValues) => {
    updateMutation.mutate(values.email, {
      onSuccess: () => {
        toast.success("Email updated. Use it to sign in from now on.");
        setOpen(false);
      },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <SettingsSection id="email" title="Email">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-medium break-all">
              {church.email || "No email set yet"}
            </h4>
            <p className="text-xs text-muted-foreground">
              One email for your sign-in, your profile and the church
              contact.
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Change
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              This updates the sign-in credential, the admin profile and the
              church contact email together.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <ValidatedForm schemaValidation onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField required
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New email address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@church.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !form.formState.isDirty}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Email"
                  )}
                </Button>
              </DialogFooter>
            </ValidatedForm>
          </Form>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}

// ─── Preferences ────────────────────────────────────────────

function PreferencesSection() {
  const canManage = useCanManageChurchSettings();
  const configQuery = useChurchConfig();
  const updateMutation = useUpdateChurchConfig();

  const [timezone, setTimezone] = React.useState<string>("Africa/Lagos");
  const [currency, setCurrency] = React.useState<string>("NGN");
  const [initial, setInitial] = React.useState<{ timezone: string; currency: string } | null>(null);

  React.useEffect(() => {
    if (configQuery.data && initial === null) {
      const tz = String(configQuery.data.config.timezone ?? "Africa/Lagos");
      const cur = String(configQuery.data.config.currency ?? "NGN");
      setTimezone(tz);
      setCurrency(cur);
      setInitial({ timezone: tz, currency: cur });
    }
  }, [configQuery.data, initial]);

  const isDirty =
    initial !== null && (timezone !== initial.timezone || currency !== initial.currency);

  useUnsavedChanges(isDirty);
  const handleSave = () => {
    updateMutation.mutate(
      { timezone, currency },
      {
        onSuccess: () => {
          setInitial({ timezone, currency });
          toast.success("Preferences saved.");
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <SettingsSection id="preferences" title="Preferences">
      {configQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          <FieldRow label="Timezone" htmlFor="pref-timezone">
            <Select
              value={timezone}
              onValueChange={setTimezone}
              disabled={!canManage || updateMutation.isPending}
            >
              <SelectTrigger id="pref-timezone" className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Currency" htmlFor="pref-currency">
            <Select
              value={currency}
              onValueChange={setCurrency}
              disabled={!canManage || updateMutation.isPending}
            >
              <SelectTrigger id="pref-currency" className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      )}
      {canManage && configQuery.data && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending || configQuery.isLoading}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

// ─── Tab ────────────────────────────────────────────────────

export function GeneralSettingsTab() {
  const churchQuery = useChurch();

  return (
    <>
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-semibold">General Settings</h2>
      </div>

      {churchQuery.isLoading ? (
        <div className="pt-6">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="mt-6 h-24 w-full rounded-lg" />
          <Skeleton className="mt-6 h-32 w-full rounded-lg" />
        </div>
      ) : churchQuery.isError || !churchQuery.data ? (
        <div className="flex flex-col items-center gap-3 pb-6 pt-10 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {(churchQuery.error as Error | null)?.message || "Failed to load church settings."}
          </p>
          <Button variant="outline" size="sm" onClick={() => churchQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <ChurchSection church={churchQuery.data} />
          <EmailSection church={churchQuery.data} />
          <PreferencesSection />
        </>
      )}
    </>
  );
}
