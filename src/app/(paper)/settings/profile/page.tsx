"use client";

import * as React from "react";
import {
  Camera,
  Check,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
  PersonAvatar,
} from "@/components/paper/primitives";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCurrentProfile,
  useUpdateCurrentProfile,
  useUploadAvatar,
} from "@/hooks/use-profile";
import { useRoleLabelMap, resolveRoleLabel } from "@/hooks/use-roles";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsProfilePage() {
  const router = useRouter();
  const profile = useCurrentProfile();
  const labelMap = useRoleLabelMap();
  const update = useUpdateCurrentProfile();
  const uploadAvatar = useUploadAvatar();

  const p = profile.data;
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [started, setStarted] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (p && !started) {
      setForm({
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone ?? "",
      });
      setStarted(true);
    }
  }, [p, started]);

  const dirty = p
    ? form.firstName !== p.firstName ||
      form.lastName !== p.lastName ||
      form.phone !== (p.phone ?? "")
    : false;

  const save = () => {
    if (!p) return;
    const input: { firstName?: string; lastName?: string; phone?: string } = {};
    if (form.firstName !== p.firstName) input.firstName = form.firstName.trim();
    if (form.lastName !== p.lastName) input.lastName = form.lastName.trim();
    if (form.phone !== (p.phone ?? "")) input.phone = form.phone.trim();
    if (!Object.keys(input).length) return;
    update.mutate(input, {
      onSuccess: () => toast.success("Profile updated."),
      onError: (e) =>
        toast.error(getToastErrorMessage(e, "Couldn't save your profile.")),
    });
  };

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Profile photos must be images.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That image is over the 5 MB limit.");
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
    uploadAvatar.mutate(file, {
      onSuccess: (res) => {
        setPhotoPreview(null);
        toast.success("Photo updated. The whole workspace sees it.");
        void res;
      },
      onError: (e) => {
        setPhotoPreview(null);
        toast.error(
          getToastErrorMessage(
            e,
            "Couldn't upload the photo. Your profile is unchanged.",
          ),
        );
      },
    });
  };

  const heading = (
    <PageHeader
      eyebrow="Settings · Profile"
      title="My profile"
      description="Your photo, contact details and place in the church team."
    />
  );
  if (profile.isError)
    return (
      <div className="space-y-6">
        {heading}
        <EmptyState
          title="Your profile could not be loaded"
          description="Try opening your profile again."
          action={
            <Button variant="outline" onClick={() => void profile.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  if (profile.isLoading || !p) {
    return (
      <div className="space-y-6">
        {heading}
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const shownName = photoPreview ? null : p.avatarUrl;

  return (
    <div className="space-y-6">
      {heading}
      <div className="paper-card flex flex-wrap items-center gap-4 rounded-2xl p-5">
        <div className="relative">
          <PersonAvatar
            name={`${p.firstName} ${p.lastName}`}
            src={shownName ?? undefined}
            size="lg"
          />
          <ActionTooltip label="Change profile photo">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-line bg-card text-ink-faint shadow-sm hover:text-ink"
            >
              {uploadAvatar.isPending ? (
                <Skeleton className="size-3" />
              ) : (
                <Camera className="size-3" />
              )}
            </button>
          </ActionTooltip>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold">
            {p.firstName} {p.lastName}
          </p>
          <p className="text-[11px] text-ink-faint">
            {p.email ?? "No email on file"}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {p.role.map((r) => (
              <Tag
                key={r}
                tone={
                  r === "super_admin" || r === "church_admin"
                    ? "brand"
                    : "neutral"
                }
              >
                {resolveRoleLabel(r, labelMap)}
              </Tag>
            ))}
            {p.isAdminHq ? <Tag tone="sky">Admin HQ</Tag> : null}
            {p.twoFactorEnabled ? (
              <Tag tone="moss" dot>
                2FA on
              </Tag>
            ) : null}
          </p>
        </div>
        {photoPreview ? (
          <p className="flex items-center gap-1.5 text-[10px] text-ink-faint">
            {uploadAvatar.isPending ? "Uploading photo…" : "Processing…"}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SectionCard
          eyebrow="Basic information"
          title="The name the workspace calls you by"
          actions={
            <div className="flex gap-2">
              {dirty ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-full text-[11px]"
                    onClick={() =>
                      setForm({
                        firstName: p.firstName,
                        lastName: p.lastName,
                        phone: p.phone ?? "",
                      })
                    }
                  >
                    <X className="mr-1 size-3" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 rounded-full text-[11px]"
                    disabled={update.isPending}
                    onClick={save}
                  >
                    <Check className="size-3" />{" "}
                    {update.isPending ? "Saving…" : "Save"}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full border-line text-[11px] text-ink-faint"
                  disabled
                >
                  Saved on this device
                </Button>
              )}
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">First name</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                className="h-10 rounded-lg border-line bg-card text-sm shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last name</Label>
              <Input
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                className="h-10 rounded-lg border-line bg-card text-sm shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="h-10 rounded-lg border-line bg-card text-sm shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email (admin-managed)</Label>
              <Input
                value={p.email ?? ""}
                readOnly
                disabled
                className="h-10 rounded-lg border-line bg-muted/40 text-sm shadow-none"
              />
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
            Email is a sign-in credential managed by your church admin. Changes
            ripple through the shared directory.
          </p>
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard eyebrow="Your place" title="Account">
            <DataList>
              <FieldRow label="Church">{p.church?.name ?? "Not available"}</FieldRow>
              <FieldRow label="Branch">
                {p.branch?.name ?? "Church-wide"}
                {p.branch?.isHeadquarters ? " · HQ" : ""}
              </FieldRow>
              <FieldRow label="Since">
                {new Date(p.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </FieldRow>
              <FieldRow label="Status">
                <span className="flex items-center gap-1">
                  <UserRound className="size-3" />
                  {p.status}
                </span>
              </FieldRow>
            </DataList>
          </SectionCard>

          <SectionCard eyebrow="Locked doors" title="Security lives elsewhere">
            <div className="space-y-2 text-[11px] text-ink-soft">
              <button
                type="button"
                onClick={() => router.push("/settings/security")}
                className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left hover:border-brand/40"
              >
                <KeyRound className="size-3.5 text-brand" /> Password &amp;
                two-factor
              </button>
              <Link
                href="/settings/notifications"
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 hover:border-brand/40"
              >
                <Mail className="size-3.5 text-moss" /> What reaches you, and
                when
              </Link>
              <Link
                href="/settings/appearance"
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 hover:border-brand/40"
              >
                <ShieldCheck className="size-3.5 text-sky" /> Light, dark, and
                rhythm
              </Link>
              <p className="flex items-center gap-1.5 pt-1 text-[10px] text-ink-faint">
                <Phone className="size-3" /> Your phone is how the care team
                finds you on a Monday.
              </p>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
