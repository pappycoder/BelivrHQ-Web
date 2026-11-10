"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import { LoadingState } from "@/components/shared/loading-state";
import { UrlTabs } from "@/components/shared/url-tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  CreditCard,
  KeyRound,
  LockKeyhole,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { StatCard } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  SearchField,
} from "@/components/paper/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useManageConfirmation } from "@/components/shared/manage-confirmation";
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
const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  voice: Phone,
  payment: CreditCard,
};
const STATUS_LABELS: Record<string, string> = {
  verified: "Verified",
  limited: "Limited check",
  failed: "Check failed",
  unverified: "Not checked",
  pending: "Not checked",
};
function routingState(
  data: Settings,
  channel: Channel,
): { label: string; tone: Tone } {
  const binding = data.channels.find((item) => item.channel === channel);
  if (binding?.mode !== "custom") return { label: "Disabled", tone: "neutral" };
  const account = data.accounts.find((item) => item.id === binding.account_id);
  const compatible = data.providers
    .find((item) => item.id === account?.provider)
    ?.channels.includes(channel);
  if (
    !account ||
    account.archived_at ||
    !compatible ||
    !["verified", "limited"].includes(account.verification_status)
  )
    return { label: "Needs attention", tone: "rose" };
  return {
    label:
      account.verification_status === "limited"
        ? "Limited check"
        : "Configured",
    tone: account.verification_status === "limited" ? "gold" : "moss",
  };
}

function errorText(error: unknown) {
  return typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "The request could not be completed.";
}

export function IntegrationSettingsTab() {
  const { can, ready } = usePermissions();
  const query = useQuery({
    queryKey: ["integrations-settings"],
    queryFn: ({ signal }) =>
      api.get<Settings>("/church/integrations", { signal }),
    enabled: can("integrations", "read"),
    staleTime: 60_000,
  });
  if (!ready)
    return (
      <LoadingState
        label="Checking integration access"
        variant="cards"
        rows={3}
      />
    );
  if (!can("integrations", "read"))
    return (
      <EmptyState
        icon={<LockKeyhole />}
        title="Integration access is required"
        description="Your role does not have permission to view provider accounts."
      />
    );
  if (query.isLoading)
    return (
      <LoadingState label="Loading integrations" variant="cards" rows={3} />
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="paper-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5"
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Active accounts"
          value={
            query.data.accounts.filter((account) => !account.archived_at).length
          }
          tone="brand"
          icon={<KeyRound className="size-4" />}
        />
        <StatCard
          label="Services configured"
          value={
            (Object.keys(LABELS) as Channel[]).filter((channel) =>
              ["Configured", "Limited check"].includes(
                routingState(query.data!, channel).label,
              ),
            ).length
          }
          tone="moss"
          icon={<ShieldCheck className="size-4" />}
        />
        <StatCard
          className="col-span-2 lg:col-span-1"
          label="Need attention"
          value={
            query.data.accounts.filter(
              (account) =>
                !account.archived_at &&
                !["verified", "limited"].includes(account.verification_status),
            ).length +
            (Object.keys(LABELS) as Channel[]).filter(
              (channel) =>
                routingState(query.data!, channel).label === "Needs attention",
            ).length
          }
          tone="gold"
          icon={<AlertCircle className="size-4" />}
        />
      </div>
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
          className="data-[state=inactive]:hidden"
        >
          <div className="mb-5">
            <h2 className="font-display text-xl font-semibold">
              Service routing
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Choose which account powers each service. Services stay off until
              you configure and save them.
            </p>
          </div>
          <ServiceRouting
            data={query.data}
            canManage={can("integrations", "update")}
          />
        </TabsContent>
      </UrlTabs>
    </div>
  );
}

function ServiceRouting({
  data,
  canManage,
}: {
  data: Settings;
  canManage: boolean;
}) {
  const [active, setActive] = React.useState<Channel>("email");
  const channels = Object.entries(LABELS) as [Channel, string][];
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav
        aria-label="Integration services"
        className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1"
      >
        {channels.map(([channel, label]) => {
          const Icon = CHANNEL_ICONS[channel];
          const status = routingState(data, channel);
          return (
            <button
              key={channel}
              type="button"
              aria-label={`Configure ${label}`}
              aria-pressed={active === channel}
              onClick={() => setActive(channel)}
              className={`flex min-w-0 items-start gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand ${active === channel ? "border-brand/25 bg-brand-soft/50 text-brand" : "border-line bg-card text-ink-soft hover:bg-muted/50"}`}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold">{label}</span>
                <span className="mt-1 block text-[10px] text-ink-faint">
                  {status.label}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="min-w-0">
        {channels.map(([channel, label]) => (
          <div key={channel} hidden={active !== channel}>
            <ChannelSettings
              channel={channel}
              label={label}
              data={data}
              canManage={canManage}
            />
          </div>
        ))}
      </div>
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
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  useUnsavedChanges(draft);
  const [archiveAccountId, setArchiveAccountId] = React.useState<string | null>(
    null,
  );
  const [providerId, setProviderId] = React.useState(
    data.providers[0]?.id ?? "resend",
  );
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const provider =
    data.providers.find((item) => item.id === providerId) ?? data.providers[0];
  const visibleAccounts = data.accounts.filter(
    (account) =>
      !!account.archived_at === showArchived &&
      `${account.label} ${data.providers.find((provider) => provider.id === account.provider)?.label ?? account.provider}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const closeAdd = () => {
    if (
      !busy &&
      (!draft || window.confirm("Discard the unsaved provider account?"))
    ) {
      setAddOpen(false);
      setDraft(false);
      setNotice("");
    }
  };
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["integrations-settings"] });
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy || !provider) return;
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
        provider: provider.id,
        label: String(fields.get("label") ?? "").trim(),
        credentials,
      });
      form.reset();
      setDraft(false);
      setAddOpen(false);
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
          (action === "verify"
            ? "Credential check complete."
            : "Account archived. Choose a replacement for any services using it."),
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Provider accounts
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Your church’s connections for messages, calls and payments.
          </p>
        </div>
        {canManage && (
          <Button
            className="h-9 gap-2 rounded-full text-xs"
            disabled={busy || !data.providers.length}
            onClick={() => {
              setNotice("");
              setAddOpen(true);
            }}
          >
            <Plus className="size-4" /> Add provider account
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search provider accounts…"
          className="w-full max-w-xs"
        />
        <div className="ml-auto flex gap-2">
          <FilterChip
            active={!showArchived}
            onClick={() => setShowArchived(false)}
          >
            Active
          </FilterChip>
          <FilterChip
            active={showArchived}
            onClick={() => setShowArchived(true)}
          >
            Archived
          </FilterChip>
        </div>
      </div>
      {!data.providers.length && canManage && (
        <p
          role="status"
          className="rounded-xl border border-line p-4 text-xs text-ink-soft"
        >
          No providers are available right now. Refresh the page or contact your
          administrator.
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {visibleAccounts.map((account) => (
          <div
            key={account.id}
            className="paper-card flex min-w-0 flex-col justify-between gap-4 rounded-2xl p-5"
            data-testid={`account-${account.id}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <KeyRound className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="break-words font-display text-base font-semibold">
                  {account.label}
                  <span className="mt-1 block font-sans text-xs font-normal text-ink-soft">
                    {data.providers.find((item) => item.id === account.provider)
                      ?.label ?? account.provider}
                  </span>
                </p>
                <p className="mt-0.5 text-[10px] text-ink-faint">
                  {account.verified_at
                    ? `Last checked ${new Date(account.verified_at).toLocaleString()}`
                    : "Not checked yet."}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.channels
                    .filter(
                      (binding) =>
                        binding.account_id === account.id &&
                        binding.mode === "custom",
                    )
                    .map((binding) => (
                      <Tag
                        key={binding.channel}
                        tone={account.archived_at ? "rose" : "neutral"}
                      >
                        {LABELS[binding.channel]}
                        {account.archived_at ? " · replace account" : ""}
                      </Tag>
                    ))}
                </div>
                {["termii", "twilio", "meta"].includes(account.provider) && (
                  <details className="mt-3 text-xs text-ink-soft">
                    <summary className="cursor-pointer">Callback setup</summary>
                    <p className="mt-2 break-all rounded-lg bg-muted/40 p-3">
                      Messaging callback path:
                      <br />
                      <code>/api/v1/integrations/webhooks/{account.id}</code>
                    </p>
                  </details>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <Tag tone={statusTone(account)} dot>
                {account.archived_at
                  ? "Archived"
                  : (STATUS_LABELS[account.verification_status] ??
                    account.verification_status)}
              </Tag>
              {canManage && !account.archived_at && (
                <RowActions
                  reveal={false}
                  actions={[
                    {
                      label: "Check credentials",
                      confirmation: { subject: account.label },
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
      </div>
      {!visibleAccounts.length && (
        <EmptyState
          icon={showArchived ? <Archive /> : <Unplug />}
          title={
            search
              ? "No matching accounts"
              : showArchived
                ? "No archived accounts"
                : "Your connections start here"
          }
          description={
            search
              ? "Try a provider name or clear your search."
              : showArchived
                ? "Accounts you archive will appear here."
                : "Add a provider account, check its credentials and choose the services it should power."
          }
          action={
            search ? (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : canManage && !showArchived && provider ? (
              <Button
                className="gap-2 rounded-full"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" /> Add your first account
              </Button>
            ) : undefined
          }
        />
      )}
      <div className="flex items-start gap-3 rounded-xl bg-brand-soft/35 px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-brand" />
        <p>
          Credentials are encrypted and hidden after saving. To replace a key,
          add a new account, check it and switch your services before archiving
          the old one.
        </p>
      </div>
      {canManage && provider && (
        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            if (!open) closeAdd();
          }}
        >
          <DialogContent
            className="max-h-[85vh] overflow-y-auto border-line bg-card sm:max-w-xl"
            showCloseButton={!busy}
            onEscapeKeyDown={(event) => {
              if (busy) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle className="font-display">
                Add provider account
              </DialogTitle>
              <DialogDescription>
                Choose your provider and enter the account credentials. Secret
                values cannot be viewed after saving.
              </DialogDescription>
            </DialogHeader>
            <ValidatedForm
              key={provider.id}
              onSubmit={create}
              onChange={(event) => {
                if ((event.target as HTMLElement).id !== "integration-provider")
                  setDraft(true);
              }}
              autoComplete="off"
              data-sentry-block
              className="mt-4 space-y-4 rounded-xl border border-line bg-background/40 p-4"
            >
              <fieldset disabled={busy} className="space-y-4">
                <legend className="sr-only">New account</legend>
                <div className="space-y-1.5">
                  <Label htmlFor="integration-provider" className="text-xs">
                    Provider
                  </Label>
                  <select
                    id="integration-provider"
                    value={provider.id}
                    onChange={(event) => {
                      if (
                        !draft ||
                        window.confirm(
                          "Change provider and discard the entered account details?",
                        )
                      ) {
                        setProviderId(event.currentTarget.value);
                        setDraft(false);
                        setNotice("");
                      }
                    }}
                    className={fieldClass}
                  >
                    {data.providers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] leading-relaxed text-ink-soft">
                  {provider.help}
                </p>
                <div className="space-y-1.5">
                  <Label required htmlFor="account-label" className="text-xs">
                    Account name
                  </Label>
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
                    <Label required={!field.optional}
                      htmlFor={`credential-${field.key}`}
                      className="text-xs"
                    >
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
                {notice && (
                  <p role="alert" className="text-sm text-destructive">
                    {notice}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={closeAdd}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-9 rounded-full text-xs"
                    loading={busy}
                  >
                    Save provider account
                  </Button>
                </div>
              </fieldset>
            </ValidatedForm>
          </DialogContent>
        </Dialog>
      )}
      <ConfirmDeleteDialog
        open={!!archiveAccountId}
        onOpenChange={(open) => {
          if (!open && !busy) setArchiveAccountId(null);
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
      {notice && !addOpen && (
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
  const { confirm, dialog } = useManageConfirmation();
  const formRef = React.useRef<HTMLFormElement>(null);
  const touched = React.useRef(false);
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
  const Icon = CHANNEL_ICONS[channel];
  const routeStatus = routingState(data, channel);
  const dirty =
    senderDirty ||
    mode !== (saved?.mode === "custom" ? "custom" : "disabled") ||
    accountId !== (saved?.account_id ?? "");
  React.useEffect(() => {
    if (touched.current) return;
    setMode(saved?.mode === "custom" ? "custom" : "disabled");
    setAccountId(saved?.account_id ?? "");
    setSenderDirty(false);
    for (const key of ["from", "senderName", "replyTo"]) {
      const control = formRef.current?.elements.namedItem(key);
      if (control instanceof HTMLInputElement)
        control.value = saved?.settings?.[key] ?? "";
    }
  }, [saved]);
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
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !canManage ||
      busy ||
      (mode === "custom" &&
        (!selected ||
          !["verified", "limited"].includes(selected.verification_status)))
    )
      return;
    const values = new FormData(event.currentTarget);
    const settings: Record<string, string> = {};
    if (mode === "custom")
      for (const key of ["from", "senderName", "replyTo"]) {
        const value = String(values.get(key) ?? "").trim();
        if (value) settings[key] = value;
      }
    const payload = {
      mode,
      ...(mode === "custom" ? { accountId, provider, settings } : {}),
    };
    confirm({
      title: `Save ${label.toLowerCase()} settings?`,
      subject: mode === "custom" ? selected!.label : label,
      description:
        mode === "disabled"
          ? `This disables ${label.toLowerCase()} for your church.`
          : `Use ${selected!.label} for ${label.toLowerCase()} with the sender settings shown.`,
      onConfirm: async () => {
        setBusy(true);
        setNotice("");
        try {
          await api.put(`/church/integrations/channels/${channel}`, payload);
          touched.current = false;
          setSenderDirty(false);
          toast.success(`${label} settings saved`);
          await client.invalidateQueries({
            queryKey: ["integrations-settings"],
          });
        } catch (error) {
          setNotice(errorText(error));
          throw error;
        } finally {
          setBusy(false);
        }
      },
    });
  }
  async function test(destination: string) {
    if (!canManage || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await api.post<{ message: string }>(
        `/church/integrations/channels/${channel}/test`,
        { recipient: destination },
      );
      setNotice(result.message);
    } catch (error) {
      setNotice(errorText(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id={`channel-${channel}`}
      data-settings-section
      className="paper-card min-w-0 space-y-5 rounded-2xl p-5 sm:p-6"
    >
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold">{label}</h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              {saved?.mode === "custom"
                ? (data.accounts.find(
                    (account) => account.id === saved.account_id,
                  )?.label ?? "Account unavailable")
                : "No account connected"}
            </p>
          </div>
        </div>
        <Tag tone={routeStatus.tone} dot>
          {routeStatus.label}
        </Tag>
      </div>
      {dirty && (
        <p role="status" className="text-xs font-medium text-gold">
          Unsaved changes
        </p>
      )}
      {routeStatus.label === "Needs attention" && (
        <p
          role="alert"
          className="rounded-lg bg-rose-soft/50 p-3 text-xs leading-relaxed text-rose"
        >
          The saved account is unavailable or needs a credential check. Choose
          an eligible account before using this service.
        </p>
      )}
      {channel === "voice" && (
        <p className="text-xs leading-relaxed text-ink-soft">
          Calls ring your saved staff phone first, then connect the member.
          Calls are limited to ten minutes.
        </p>
      )}
      <ValidatedForm
        ref={formRef}
        onSubmit={save}
        onChange={() => {
          touched.current = true;
          setSenderDirty(true);
        }}
        className="space-y-4"
      >
        <fieldset disabled={!canManage || busy} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${channel}-mode`} className="text-xs">
              Account source
            </Label>
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
                <Label required htmlFor={`${channel}-account`} className="text-xs">
                  Provider account
                </Label>
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
              {!accounts.length && (
                <p className="rounded-lg bg-muted/50 p-3 text-xs text-ink-soft">
                  Add a compatible provider account in Provider accounts, then
                  check its credentials before connecting this service.
                </p>
              )}
              {selected?.verification_status === "limited" && (
                <p className="text-[11px] leading-relaxed text-ink-soft">
                  Account inspection was limited. Save this service and send a
                  controlled test to confirm that the credentials and sender
                  work.
                </p>
              )}
              {channel === "email" && (
                <div key={accountId} className="grid gap-4 sm:grid-cols-2">
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
                      <Label required={field.required}
                        htmlFor={`${channel}-${field.key}`}
                        className="text-xs"
                      >
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
                    <Label required htmlFor={`${channel}-from`} className="text-xs">
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
            <Button
              type="submit"
              className="h-9 rounded-full text-xs"
              loading={busy}
              disabled={
                !dirty ||
                (mode === "custom" &&
                  (!selected ||
                    !["verified", "limited"].includes(
                      selected.verification_status,
                    )))
              }
            >
              Save {label.toLowerCase()} settings
            </Button>
          )}
        </fieldset>
      </ValidatedForm>
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
      {canManage &&
        saved?.mode === "custom" &&
        routeStatus.label !== "Needs attention" &&
        channel !== "payment" && (
          <ValidatedForm
            className="space-y-3 rounded-xl border border-dashed border-line bg-muted/20 p-4"
            data-sentry-block
            onSubmit={(event) => {
              event.preventDefault();
              if (dirty || busy) return;
              const destination = recipient.trim();
              confirm({
                title:
                  channel === "voice"
                    ? "Connect test call?"
                    : "Send test message?",
                subject: destination,
                description: `This uses the saved ${label.toLowerCase()} settings. A real message or call will be sent and provider charges may apply.`,
                onConfirm: () => test(destination),
              });
            }}
          >
            <p className="rule-label">Test this connection</p>
            {dirty && (
              <p className="text-xs text-ink-soft">
                Save your changes before testing.
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-ink-soft">
              Tests use saved settings and send a real message or connect a live
              call. Provider charges may apply. WhatsApp text tests need an open
              conversation window. Sender/domain approval remains the provider’s
              responsibility.
            </p>
            <div className="space-y-1.5">
              <Label required htmlFor={`${channel}-recipient`} className="text-xs">
                {channel === "email"
                  ? "Test email recipient"
                  : channel === "voice"
                    ? "Test call destination (+country code)"
                    : "Test phone recipient (+country code)"}
              </Label>
              <Input
                id={`${channel}-recipient`}
                type={channel === "email" ? "email" : "tel"}
                required
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="h-9 rounded-full border-line text-xs"
              disabled={busy || !recipient.trim() || dirty}
            >
              {channel === "voice" ? "Connect test call" : "Send test message"}
            </Button>
          </ValidatedForm>
        )}
      {notice && (
        <p role="status" className="text-[11px] text-ink-soft">
          {notice}
        </p>
      )}
    </section>
  );
}
