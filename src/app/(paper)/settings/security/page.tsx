"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";

import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";

import * as React from "react";
import { Eye, EyeOff, RefreshCcw, ShieldCheck, Smartphone } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecoveryCodesPanel } from "@/components/shared/recovery-codes-panel";
import {
  useCurrentProfile,
  useChangePassword,
  useAuthenticatorFactors,
  useSetupAuthenticator,
  useToggleTwoFactor,
  useRegenerateRecoveryCodes,
  type AuthenticatorSetup,
} from "@/hooks/use-profile";

function PasswordCard() {
  const change = useChangePassword();
  const captchaReady = useBotProtectionReady("/auth/password", "PUT");
  const [show, setShow] = React.useState(false);
  const [form, setForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 8;
  const mismatch = form.confirm.length > 0 && form.newPassword !== form.confirm;
  const canSubmit =
    form.currentPassword &&
    form.newPassword.length >= 8 &&
    form.confirm === form.newPassword;

  const submit = () => {
    if (!canSubmit) return;
    change.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          setForm({ currentPassword: "", newPassword: "", confirm: "" });
          toast.success(
            "Password updated. Other devices will need the new one.",
          );
        },
        onError: (e) =>
          toast.error(getToastErrorMessage(e, "Couldn't change the password.")),
      },
    );
  };

  return (
    <SectionCard eyebrow="Password" title="Something you'd never type aloud">
      <div className="grid gap-4 sm:grid-cols-2">
          <RequiredFieldsNotice className="col-span-full" />
        <div className="space-y-1.5">
          <Label required className="text-xs">Current password</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={form.currentPassword}
              onChange={(e) =>
                setForm((f) => ({ ...f, currentPassword: e.target.value }))
              }
              placeholder="••••••••••"
              className="h-10 rounded-lg border-line bg-card pr-9 text-sm shadow-none"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide passwords" : "Show passwords"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            >
              {show ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </button>
          </div>
        </div>
        <div />
        <div className="space-y-1.5">
          <Label required className="text-xs">New password</Label>
          <Input
            type={show ? "text" : "password"}
            value={form.newPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, newPassword: e.target.value }))
            }
            placeholder="A phrase, not a word"
            className="h-10 rounded-lg border-line bg-card text-sm shadow-none"
          />
          {tooShort ? (
            <p className="text-[10px] text-rose">Eight characters at least.</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label required className="text-xs">Confirm</Label>
          <Input
            type={show ? "text" : "password"}
            value={form.confirm}
            onChange={(e) =>
              setForm((f) => ({ ...f, confirm: e.target.value }))
            }
            className="h-10 rounded-lg border-line bg-card text-sm shadow-none"
          />
          {mismatch ? (
            <p className="text-[10px] text-rose">
              The two don&apos;t match yet.
            </p>
          ) : null}
        </div>
      </div>
      <BotProtection path="/auth/password" method="PUT" authenticated />
      <div className="mt-4 flex justify-end">
        <Button
          className="h-9 gap-1.5 rounded-full text-xs"
          disabled={!canSubmit || change.isPending || !captchaReady}
          onClick={submit}
        >
          <ShieldCheck className="size-3.5" />{" "}
          {change.isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </SectionCard>
  );
}

function TwoFactorCard() {
  const profile = useCurrentProfile();
  const factors = useAuthenticatorFactors();
  const setup = useSetupAuthenticator();
  const toggle = useToggleTwoFactor();
  const list = factors.data ?? [];
  const verified = list.find((f) => f.status === "verified");
  const enabled = !!verified || !!profile.data?.twoFactorEnabled;

  const [setupData, setSetupData] = React.useState<AuthenticatorSetup | null>(
    null,
  );
  const [code, setCode] = React.useState("");
  const [recovery, setRecovery] = React.useState<string[] | null>(null);
  const [action, setAction] = React.useState<"idle" | "enroll" | "disable">(
    "idle",
  );

  const beginSetup = () => {
    setup.mutate(undefined, {
      onSuccess: (res) => {
        setSetupData(res);
        setAction("enroll");
        setCode("");
      },
      onError: (e) =>
        toast.error(
          getToastErrorMessage(e, "Couldn't start the authenticator setup."),
        ),
    });
  };

  const confirmEnable = () => {
    if (!setupData || code.length < 6) return;
    toggle.mutate(
      { purpose: "enable", code, factorId: setupData.factorId },
      {
        onSuccess: (res) => {
          setSetupData(null);
          setAction("idle");
          setCode("");
          if (res.recoveryCodes?.length) setRecovery(res.recoveryCodes);
          toast.success("Two-factor is on.");
        },
        onError: (e) =>
          toast.error(
            getToastErrorMessage(
              e,
              "That code didn't verify. Try the next one.",
            ),
          ),
      },
    );
  };

  const confirmDisable = () => {
    if (!verified || code.length < 6) return;
    toggle.mutate(
      { purpose: "disable", code, factorId: verified.id },
      {
        onSuccess: () => {
          setAction("idle");
          setCode("");
          toast("Two-factor authentication paused. Keeping it enabled is recommended for administrators.");
        },
        onError: (e) =>
          toast.error(getToastErrorMessage(e, "Couldn't pause two-factor.")),
      },
    );
  };

  if (recovery) {
    return (
      <RecoveryCodesPanel codes={recovery} onDone={() => setRecovery(null)} />
    );
  }

  return (
    <SectionCard
      eyebrow="Second factor"
      title="Two-step verification"
      actions={
        enabled ? (
          <Tag tone="moss" dot>
            On
          </Tag>
        ) : (
          <Tag tone="gold" dot>
            Not set
          </Tag>
        )
      }
    >
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Sign in using codes from an authenticator app on your phone.
      </p>

      {!enabled && action !== "enroll" ? (
        <Button
          className="mt-3 h-9 gap-1.5 rounded-full text-xs"
          disabled={setup.isPending}
          onClick={beginSetup}
        >
          <Smartphone className="size-3.5" />{" "}
          {setup.isPending ? "Preparing…" : "Set up authenticator"}
        </Button>
      ) : null}

      {action === "enroll" && setupData ? (
        <div className="mt-3 space-y-3 rounded-xl border border-line bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setupData.qrCode}
              alt="QR code for authenticator setup"
              className="size-36 rounded-lg border border-line bg-white p-1"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[11px] text-ink-soft">
                Scan the QR in your authenticator app, or paste the key:
              </p>
              <p className="break-all rounded-lg bg-card px-2.5 py-1.5 font-mono text-[10px] text-ink">
                {setupData.secret}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label required className="text-xs">Six-digit code</Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="num h-10 w-32 rounded-lg border-line bg-card text-center text-sm shadow-none"
              />
            </div>
            <Button
              className="h-10 gap-1.5 rounded-lg text-xs"
              disabled={toggle.isPending || code.length < 6}
              onClick={confirmEnable}
            >
              <ShieldCheck className="size-3.5" />{" "}
              {toggle.isPending ? "Verifying…" : "Verify & enable"}
            </Button>
            <Button
              variant="ghost"
              className="h-10 rounded-lg text-xs text-ink-faint"
              onClick={() => {
                setAction("idle");
                setSetupData(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {enabled && (action === "idle" || action === "disable") ? (
        <div className="mt-3 space-y-2.5">
          {verified?.recoveryCodesRemaining !== undefined ? (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-line px-3 py-2.5">
              <span className="text-[11px] text-ink-soft">
                Recovery codes left:{" "}
                <span className="num font-semibold text-ink">
                  {verified.recoveryCodesRemaining}
                </span>
              </span>
              <RegenerateInline factorId={verified.id} onCodes={setRecovery} />
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
            <span className="min-w-0 text-[11px] text-ink-soft">
              Pause two-step? You&apos;ll need a current code.
            </span>
            {action === "disable" ? (
              <span className="flex items-center gap-1.5">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="num h-8 w-24 rounded-lg border-line bg-card text-center text-xs shadow-none"
                />
                <Button
                  size="xs"
                  variant="outline"
                  className="h-8 rounded-full border-line text-[10px] text-rose"
                  disabled={toggle.isPending}
                  onClick={confirmDisable}
                >
                  Confirm
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-8 rounded-full text-[10px]"
                  onClick={() => {
                    setAction("idle");
                    setCode("");
                  }}
                >
                  Cancel
                </Button>
              </span>
            ) : (
              <Button
                size="xs"
                variant="outline"
                className="h-8 rounded-full border-line text-[10px]"
                onClick={() => {
                  setAction("disable");
                  setCode("");
                }}
              >
                Pause two-step
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!enabled && action !== "enroll" ? (
        <p className="mt-2 text-[10px] text-ink-faint">
          {profile.data?.twoFactorEnabled
            ? "Your account shows two-factor on. Refresh if the app list looks empty."
            : "One missed phone is all it takes; second factors exist for that Monday."}
        </p>
      ) : null}
    </SectionCard>
  );
}

function RegenerateInline({
  factorId,
  onCodes,
}: {
  factorId: string;
  onCodes: (codes: string[]) => void;
}) {
  const regenerate = useRegenerateRecoveryCodes();
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  return (
    <span className="flex items-center gap-1.5">
      {open ? (
        <>
          <Input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="num h-8 w-24 rounded-lg border-line bg-card text-center text-xs shadow-none"
          />
          <Button
            size="xs"
            className="h-8 rounded-full text-[10px]"
            disabled={regenerate.isPending || code.length < 6}
            onClick={() =>
              regenerate.mutate(
                { code, factorId },
                {
                  onSuccess: (res) => {
                    setOpen(false);
                    setCode("");
                    if (res.recoveryCodes?.length) {
                      onCodes(res.recoveryCodes);
                      toast("New recovery codes issued. Old ones are void.");
                    }
                  },
                  onError: (e) =>
                    toast.error(
                      getToastErrorMessage(e, "Couldn't regenerate codes."),
                    ),
                },
              )
            }
          >
            {regenerate.isPending ? "Working…" : "Issue"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className="h-8 rounded-full text-[10px]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </>
      ) : (
        <Button
          size="xs"
          variant="outline"
          className="h-8 gap-1 rounded-full border-line text-[10px]"
          onClick={() => setOpen(true)}
        >
          <RefreshCcw className="size-2.5" /> Regenerate
        </Button>
      )}
    </span>
  );
}

export default function SettingsSecurityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings · Security"
        title="Security"
        description="Protect your account with a strong password, two-factor authentication and recovery codes."
      />
      <PasswordCard />
      <TwoFactorCard />
    </div>
  );
}
