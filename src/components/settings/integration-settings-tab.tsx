"use client";

import { LoadingState } from "@/components/shared/loading-state";
import { UrlTabs } from "@/components/shared/url-tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, KeyRound, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RowActions } from "@/components/paper/primitives";
import { Tag, type Tone } from "@/components/paper/stat";

/** One field grammar across every integration form. */
const fieldClass =
  "h-10 w-full rounded-lg border border-line bg-background px-3 text-sm shadow-none outline-none";

function statusTone(account: Account): Tone {
  if (account.archived_at) return "neutral";
  if (account.verification_status === "verified") return "moss";
  if (account.verification_status === "limited") return "gold";
  if (account.verification_status === "failed") return "rose";
  return "sky";
}

type Channel = "email" | "whatsapp" | "sms" | "voice" | "payment";
type Mode = "custom" | "disabled";
interface Provider {
  id: string;
  label: string;
  channels: Channel[];
  fields: {
    key: string;
    label: string;
    secret?: boolean;
    optional?: boolean;
    options?: string[];
  }[];
  help: string;
}
interface Account {
  id: string;
  provider: string;
  label: string;
  verification_status: string;
  verified_at: string | null;
  archived_at: string | null;
}
interface Binding {
  channel: Channel;
  mode: Mode;
  account_id: string | null;
  settings: Record<string, string>;
  updated_at: string;
}
interface Settings {
  providers: Provider[];
  accounts: Account[];
  channels: Binding[];
}
const LABELS: Record<Channel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  voice: "Live calls",
  payment: "Payments",
};
function errorText(error: unknown) {
  return typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "The request could not be completed.";
}

export function IntegrationSettingsTab() {
  const { can } = usePermissions();
  const query = useQuery({
    queryKey: ["integrations-settings"],
    queryFn: ({ signal }) =>
      api.get<Settings>("/church/integrations", { signal }),
    enabled: can("integrations", "read"),
    staleTime: 60_000,
  });
  if (!can("integrations", "read")) return null;
  if (query.isLoading) return <LoadingState label="Loading integrations" variant="cards" rows={3} />;
  if (query.isError)
    return (
      <div
        role="alert"
        className="paper-card flex items-center justify-between gap-3 rounded-2xl p-5"
      >
        <p className="text-xs text-ink-soft">Unable to load integrations.</p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full border-line text-xs"
          onClick={() => void query.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  if (!query.data) return null;
  return (
    <div className="space-y-6">
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Add provider accounts, check their credentials, then choose an account
        separately for each service. A compatible account can be shared across
        services. Each service stays disabled until you select and save a
        church-owned provider account. Platform credentials are never used for
        church services.
      </p>
      <UrlTabs
        defaultValue="accounts"
        values={["accounts", "services"]}
        className="space-y-6"
      >
        <TabsList
          aria-label="Integration views"
          className="h-9 w-fit gap-1 rounded-full border border-line bg-card p-0.5"
        >
          <TabsTrigger
            value="accounts"
            className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper"
          >
            Provider accounts
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper"
          >
            Service routing
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="accounts"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <ProviderAccounts
            data={query.data}
            canManage={can("integrations", "update")}
          />
        </TabsContent>
        <TabsContent
          value="services"
          forceMount
          className="space-y-6 data-[state=inactive]:hidden"
        >
          {Object.entries(LABELS)
            .filter(([channel]) =>
              query.data!.channels.some((item) => item.channel === channel),
            )
            .map(([channel, label]) => (
              <ChannelSettings
                key={channel}
                channel={channel as Channel}
                label={label}
                data={query.data!}
                canManage={can("integrations", "update")}
              />
            ))}
        </TabsContent>
      </UrlTabs>
    </div>
  );
}

function ProviderAccounts({
  data,
  canManage,
}: {
  data: Settings;
  canManage: boolean;
}) {
  const client = useQueryClient();
  const [draft, setDraft] = React.useState(false);
  useUnsavedChanges(draft);
  const [archiveAccountId, setArchiveAccountId] = React.useState<string | null>(
    null,
  );
  const [providerId, setProviderId] = React.useState(
    data.providers[0]?.id ?? "resend",
  );
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const provider = data.providers.find((item) => item.id === providerId)!;
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["integrations-settings"] });
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const credentials: Record<string, string> = {};
    for (const field of provider.fields) {
      const value = String(fields.get(field.key) ?? "").trim();
      if (value) credentials[field.key] = value;
    }
    setBusy(true);
    setNotice("");
    try {
      await api.post("/church/integrations/accounts", {
        provider: providerId,
        label: String(fields.get("label") ?? "").trim(),
        credentials,
      });
      form.reset();
      setDraft(false);
      await refresh();
      setNotice(
        "Account saved securely. Check credentials before assigning it to a service.",
      );
    } catch (error) {
      setNotice(errorText(error));
    } finally {
      for (const field of provider.fields.filter((item) => item.secret)) {
        const control = form.elements.namedItem(field.key);
        if (control instanceof HTMLInputElement) control.value = "";
      }
      setBusy(false);
    }
  }
  async function accountAction(id: string, action: "verify" | "archive") {
    if (!canManage || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await api.post<{ message?: string }>(
        `/church/integrations/accounts/${id}/${action}`,
        {},
      );
      setNotice(
        result.message ??
          "Account archived. Channels using it are blocked until another account is selected.",
      );
      await refresh();
      if (action === "archive") setArchiveAccountId(null);
    } catch (error) {
      setNotice(errorText(error));
      if (action === "verify") throw error;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="provider-accounts" data-settings-section className="space-y-3">
      <p className="rule-label">Vault</p>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Keys are encrypted on the server and cannot be viewed after saving. To
        rotate a key, add a replacement account, check it, switch the services,
        then archive the old account. Historical payments keep their original
        account for settlement.
      </p>
      {data.accounts.map((account) => (
        <div
          key={account.id}
          className="paper-card flex flex-wrap items-start justify-between gap-3 rounded-2xl p-4"
          data-testid={`account-${account.id}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <KeyRound className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {account.label} —{" "}
                {data.providers.find((item) => item.id === account.provider)?.label}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-faint">
                {account.verified_at
                  ? `Last checked ${new Date(account.verified_at).toLocaleString()}`
                  : "Not checked yet."}
              </p>
              {["termii", "twilio", "meta"].includes(account.provider) && (
                <p className="mt-1 break-all text-[10px] text-ink-faint">
                  Messaging callback on your backend:{" "}
                  <code>/api/v1/integrations/webhooks/{account.id}</code>
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Tag tone={statusTone(account)} dot>
              {account.archived_at ? "Archived" : account.verification_status}
            </Tag>
            {canManage && !account.archived_at && (
              <RowActions
                reveal={false}
                actions={[
                  {
                    label: "Check credentials", confirmation: { subject: account.label },
                    icon: <ShieldCheck />,
                    disabled: busy,
                    onSelect: () => accountAction(account.id, "verify"),
                  },
                  {
                    label: "Archive account",
                    icon: <Archive />,
                    tone: "warning",
                    disabled: busy,
                    onSelect: () => {
                      setNotice("");
                      setArchiveAccountId(account.id);
                    },
                  },
                ]}
              />
            )}
          </div>
        </div>
      ))}
      {!data.accounts.length && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[11px] text-ink-faint">
          No provider accounts yet — add one below to route a service through
          your own keys.
        </p>
      )}
      {canManage && (
        <details className="paper-card rounded-2xl p-4">
          <summary className="cursor-pointer text-xs font-semibold">
            Add provider account
          </summary>
          <form
            key={providerId}
            onSubmit={create}
            onChange={() => setDraft(true)}
            autoComplete="off"
            data-sentry-block
            className="mt-4 space-y-4 rounded-xl border border-line bg-background/40 p-4"
          >
            <fieldset disabled={busy} className="space-y-4">
              <legend className="rule-label float-left w-full">
                New account
              </legend>
              <div className="space-y-1.5">
                <Label htmlFor="integration-provider" className="text-xs">Provider</Label>
                <select
                  id="integration-provider"
                  value={providerId}
                  onChange={(event) => setProviderId(event.currentTarget.value)}
                  className={fieldClass}
                >
                  {data.providers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-soft">{provider.help}</p>
              <div className="space-y-1.5">
                <Label htmlFor="account-label" className="text-xs">Account name</Label>
                <Input
                  id="account-label"
                  name="label"
                  required
                  maxLength={80}
                  placeholder="For example: Church office account"
                  className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                />
              </div>
              {provider.fields.map((field) => (
                <div className="space-y-1.5" key={field.key}>
                  <Label htmlFor={`credential-${field.key}`} className="text-xs">
                    {field.label}
                    {field.optional ? " (optional)" : ""}
                  </Label>
                  {field.options ? (
                    <select
                      id={`credential-${field.key}`}
                      name={field.key}
                      required={!field.optional}
                      className={fieldClass}
                    >
                      {field.options.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`credential-${field.key}`}
                      name={field.key}
                      type={field.secret ? "password" : "text"}
                      required={!field.optional}
                      maxLength={2048}
                      autoComplete={field.secret ? "new-password" : "off"}
                      spellCheck={false}
                      className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                    />
                  )}
                </div>
              ))}
              <Button type="submit" className="h-9 rounded-full text-xs">
                {busy ? "Working…" : "Save provider account"}
              </Button>
            </fieldset>
          </form>
        </details>
      )}
      <ConfirmDeleteDialog
        open={!!archiveAccountId}
        onOpenChange={(open) => {
          if (!open) setArchiveAccountId(null);
        }}
        title="Archive provider account?"
        description={`Archive ${data.accounts.find((account) => account.id === archiveAccountId)?.label ?? "this account"}? Dependent services: ${
          data.channels
            .filter(
              (binding) =>
                binding.account_id === archiveAccountId &&
                binding.mode === "custom",
            )
            .map((binding) => LABELS[binding.channel])
            .join(", ") || "None"
        }. Services still using this account will be blocked until a replacement is selected. ${notice}`}
        confirmLabel="Archive account"
        pendingLabel="Archiving..."
        pending={busy}
        onConfirm={() => {
          if (archiveAccountId) void accountAction(archiveAccountId, "archive");
        }}
      />
      {notice && (
        <p role="status" className="text-[11px] text-ink-soft">
          {notice}
        </p>
      )}
    </section>
  );
}

function ChannelSettings({
  channel,
  label,
  data,
  canManage,
}: {
  channel: Channel;
  label: string;
  data: Settings;
  canManage: boolean;
}) {
  const saved = data.channels.find((item) => item.channel === channel);
  const [mode, setMode] = React.useState<Mode>(
    saved?.mode === "custom" ? "custom" : "disabled",
  );
  const [accountId, setAccountId] = React.useState(saved?.account_id ?? "");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [senderDirty, setSenderDirty] = React.useState(false);
  const [recipient, setRecipient] = React.useState("");
  const client = useQueryClient();
  useUnsavedChanges(
    senderDirty ||
      mode !== (saved?.mode === "custom" ? "custom" : "disabled") ||
      accountId !== (saved?.account_id ?? ""),
  );
  const accounts = data.accounts.filter(
    (account) =>
      !account.archived_at &&
      data.providers
        .find((provider) => provider.id === account.provider)
        ?.channels.includes(channel),
  );
  const selected = accounts.find((account) => account.id === accountId);
  const provider = selected?.provider;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy) return;
    setBusy(true);
    setNotice("");
    const values = new FormData(event.currentTarget);
    const settings: Record<string, string> = {};
    if (mode === "custom")
      for (const key of ["from", "senderName", "replyTo"]) {
        const value = String(values.get(key) ?? "").trim();
        if (value) settings[key] = value;
      }
    try {
      await api.put(`/church/integrations/channels/${channel}`, {
        mode,
        ...(mode === "custom" ? { accountId, provider, settings } : {}),
      });
      setSenderDirty(false);
      toast.success(`${label} settings saved`);
      await client.invalidateQueries({ queryKey: ["integrations-settings"] });
    } catch (error) {
      setNotice(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    if (!canManage || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await api.post<{ message: string }>(
        `/church/integrations/channels/${channel}/test`,
        { recipient },
      );
      setNotice(result.message);
    } catch (error) {
      setNotice(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id={`channel-${channel}`}
      data-settings-section
      className="paper-card space-y-4 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="rule-label mb-1">Service routing</p>
          <h2 className="font-display text-base font-semibold tracking-tight">{label}</h2>
        </div>
        <Tag tone={mode === "custom" && accountId ? "moss" : "neutral"} dot>
          {mode === "custom" && accountId ? "Custom account" : "Disabled"}
        </Tag>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        {saved
          ? `Saved mode: ${saved.mode}.`
          : "Disabled until your church selects a provider account."}{" "}
        {channel === "voice" &&
          "Live calls ring your saved staff phone first, then connect the member. Calls are limited to ten minutes."}
      </p>
      <form
        onSubmit={save}
        onChange={() => setSenderDirty(true)}
        className="space-y-4"
      >
        <fieldset disabled={!canManage || busy} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${channel}-mode`} className="text-xs">Account source</Label>
            <select
              id={`${channel}-mode`}
              value={mode}
              onChange={(event) => setMode(event.currentTarget.value as Mode)}
              className={fieldClass}
            >
              <option value="custom">Choose provider account</option>
              <option value="disabled">Disable this service</option>
            </select>
          </div>
          {mode === "custom" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${channel}-account`} className="text-xs">Provider account</Label>
                <select
                  id={`${channel}-account`}
                  value={accountId}
                  onChange={(event) => setAccountId(event.currentTarget.value)}
                  required
                  className={fieldClass}
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                      disabled={
                        !["verified", "limited"].includes(
                          account.verification_status,
                        )
                      }
                    >
                      {account.label} ({account.provider};{" "}
                      {account.verification_status})
                    </option>
                  ))}
                </select>
              </div>
              {selected?.verification_status === "limited" && (
                <p className="text-[11px] leading-relaxed text-ink-soft">
                  Account inspection was limited. Save this service and send a
                  controlled test to confirm that the credentials and sender
                  work.
                </p>
              )}
              {channel === "email" && (
                <div key={accountId} className="space-y-4">
                  {[
                    { key: "from", label: "Sender email", required: true },
                    {
                      key: "senderName",
                      label: "Sender name",
                      required: false,
                    },
                    {
                      key: "replyTo",
                      label: "Reply-to email",
                      required: false,
                    },
                  ].map((field) => (
                    <div className="space-y-1.5" key={field.key}>
                      <Label htmlFor={`${channel}-${field.key}`} className="text-xs">
                        {field.label}
                      </Label>
                      <Input
                        id={`${channel}-${field.key}`}
                        name={field.key}
                        type={field.key === "senderName" ? "text" : "email"}
                        required={field.required}
                        defaultValue={
                          saved?.account_id === accountId
                            ? (saved.settings[field.key] ?? "")
                            : ""
                        }
                        maxLength={254}
                        className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              {["sms", "voice", "whatsapp"].includes(channel) &&
                provider !== "meta" && (
                  <div className="space-y-1.5" key={accountId}>
                    <Label htmlFor={`${channel}-from`} className="text-xs">
                      {provider === "termii"
                        ? channel === "sms"
                          ? "Approved SMS sender ID"
                          : "WhatsApp device ID"
                        : "Provider sender number (+country code)"}
                    </Label>
                    <Input
                      id={`${channel}-from`}
                      name="from"
                      required
                      defaultValue={
                        saved?.account_id === accountId
                          ? (saved.settings.from ?? "")
                          : ""
                      }
                      maxLength={128}
                      className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                    />
                  </div>
                )}
              {channel === "payment" && (
                <p className="text-[11px] leading-relaxed text-ink-soft">
                  The selected gateway becomes the church default for giving and
                  paid event tickets. Card authorizations cannot move to another
                  merchant account; recurring donors must authorize that account
                  again.
                </p>
              )}
            </>
          )}
          {canManage && (
            <Button type="submit" className="h-9 rounded-full text-xs">
              Save {label.toLowerCase()} settings
            </Button>
          )}
        </fieldset>
      </form>
      {channel === "payment" && (
        <p className="break-all text-[11px] leading-relaxed text-ink-soft">
          Configure the payment account webhook on your backend at{" "}
          <code>
            /api/v1/integrations/payments/webhook/{provider ?? "PROVIDER"}
          </code>
          . Credential checks do not create or charge payments. Use the
          provider’s test keys and an ordinary checkout to test settlement.
        </p>
      )}
      {canManage && saved?.mode === "custom" && channel !== "payment" && (
        <div className="space-y-3" data-sentry-block>
          <p className="text-[11px] leading-relaxed text-ink-soft">
            Tests use saved settings and send a real message or connect a live
            call. Provider charges may apply. WhatsApp text tests need an open
            conversation window. Sender/domain approval remains the provider’s
            responsibility.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={`${channel}-recipient`} className="text-xs">
              {channel === "email"
                ? "Test email recipient"
                : channel === "voice"
                  ? "Test call destination (+country code)"
                  : "Test phone recipient (+country code)"}
            </Label>
            <Input
              id={`${channel}-recipient`}
              type={channel === "email" ? "email" : "tel"}
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full border-line text-xs"
            onClick={() => void test()}
            disabled={busy || !recipient}
          >
            {channel === "voice" ? "Connect test call" : "Send test message"}
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-[11px] text-ink-soft">
          {notice}
        </p>
      )}
    </section>
  );
}
