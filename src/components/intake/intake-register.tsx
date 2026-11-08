"use client";

import { ArrowUpDown, Check, ClipboardList, Eye, X } from "lucide-react";
import { StatCard } from "@/components/paper/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { ListTable } from "@/components/shared/list-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast, getToastErrorMessage } from "@/lib/toast";
import { useCurrentProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import type { Branch, BranchListResponse } from "@/hooks/use-branches";
import type { FormField } from "@/hooks/use-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import {
  EmptyState,
  ListPaginationFooter,
  ManageHeading, PersonAvatar, RowActions, SortDirectionToggle,
  SearchField,
} from "@/components/paper/primitives";

type Kind = "members" | "visitors";
interface PendingRow {
  id: string;
  branchId: string;
  branchName: string;
  createdAt: string;
  data: Record<string, unknown>;
}
interface PendingList {
  fields?: FormField[];
  data: PendingRow[];
  meta: { total: number };
}
async function fetchPending(path: string) {
  const result = await api.get<PendingList>(path);
  if (!Array.isArray(result?.data) || !Number.isFinite(result?.meta?.total)) {
    throw new Error("Could not read the registrations response.");
  }
  return result;
}
interface PendingDetail {
  id: string;
  data: Record<string, unknown>;
  fields: FormField[];
  branchName: string;
}
function useIntakeBranches(enabled: boolean) {
  return useQuery({
    queryKey: ["intake-branches"],
    enabled,
    queryFn: async ({ signal }) => {
      const branches: Branch[] = [];
      let page = 1;
      let total = 0;
      do {
        const result = await api.get<BranchListResponse>(
          `/branches?limit=100&page=${page}`,
          { signal },
        );
        if (!Array.isArray(result.data))
          throw new Error("Could not load branches.");
        branches.push(...result.data);
        total = result.total;
        if (!result.data.length) break;
        page += 1;
      } while (branches.length < total);
      return { data: branches };
    },
  });
}

function useIntakeAccess(kind: Kind) {
  const { can, ready } = usePermissions();
  return {
    create: ready && can(`${kind}:new`, "create"),
    review:
      ready &&
      can(`${kind}:new`, "create") &&
      can(kind === "members" ? "members:all" : "visitors:list", "read"),
  };
}

export function PublicRegistrationLink({ kind }: { kind: Kind }) {
  const access = useIntakeAccess(kind);
  const { data: profile } = useCurrentProfile();
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const branches = useIntakeBranches(open && !!profile?.isAdminHq);
  const branchId = profile?.isAdminHq ? selectedBranch : profile?.branchId;
  const [link, setLink] = useState<{
    token: string;
    branchName: string;
    branchId: string;
  } | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const value = await api.post<{ token: string; branchName: string }>(
        "/intake/links",
        { kind, branchId },
      );
      return { ...value, branchId: branchId! };
    },
    onSuccess: setLink,
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, "Could not get the registration link."),
      ),
  });
  if (!access.create) return null;
  const url =
    link && link.branchId === branchId && typeof window !== "undefined"
      ? `${window.location.origin}/register/public/${link.token}`
      : "";
  return (
    <>
      <Button
        variant="outline"
        className="h-9 rounded-full text-xs"
        onClick={() => setOpen(true)}
      >
        Public registration link
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {kind === "members" ? "Member" : "Visitor"} registration link
            </DialogTitle>
            <DialogDescription>
              Anyone with this link can send a registration for your branch to
              review.
            </DialogDescription>
          </DialogHeader>
          {profile?.isAdminHq ? (
            <label className="grid gap-2 text-sm">
              Branch
              <select
                aria-label="Registration branch"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={selectedBranch}
                onChange={(event) => {
                  setSelectedBranch(event.target.value);
                  setLink(null);
                }}
              >
                <option value="">Select a branch</option>
                {branches.data?.data
                  .filter((b) => !b.archivedAt)
                  .map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <p className="text-sm">
              {profile?.branch?.name ||
                "A branch assignment is required to share a link."}
            </p>
          )}
          {branches.isError && (
            <p role="alert">
              Branches could not be loaded.{" "}
              <button onClick={() => void branches.refetch()}>Retry</button>
            </p>
          )}
          <Button
            disabled={!branchId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Getting link…" : "Get link"}
          </Button>
          {url && (
            <div className="space-y-3 rounded-xl border p-4">
              <p className="text-sm font-medium">{link?.branchName}</p>
              <Input
                aria-label="Public registration URL"
                readOnly
                value={url}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied");
                    } catch {
                      toast.error(
                        "Could not copy. Select and copy the link above.",
                      );
                    }
                  }}
                >
                  Copy link
                </Button>
                <Button variant="outline" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    Preview form
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function IntakeRegister({
  kind,
  children,
}: {
  kind: Kind;
  children: ReactNode;
}) {
  const access = useIntakeAccess(kind);
  const { data: profile } = useCurrentProfile();
  const [tab, setTab] = useState("records");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [branchId, setBranchId] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const branches = useIntakeBranches(access.review && !!profile?.isAdminHq);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const count = useQuery({
    queryKey: ["intake-count", kind, branchId],
    enabled: access.review,
    queryFn: () =>
      fetchPending(
        `/intake/submissions?${new URLSearchParams({ kind, limit: "1", ...(branchId ? { branchId } : {}) })}`,
      ),
  });
  const list = useQuery({
    queryKey: ["intake-list", kind, search, page, limit, branchId, sortBy, sortOrder],
    enabled: access.review && tab === "pending",
    queryFn: () =>
      fetchPending(
        `/intake/submissions?${new URLSearchParams({ kind, search, sortBy, sortOrder, page: String(page), limit: String(limit), ...(branchId ? { branchId } : {}) })}`,
      ),
  });
  const [target, setTarget] = useState<string | null>(null);
  const [detail, setDetail] = useState<PendingDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [confirm, setConfirm] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const inspect = useMutation({
    mutationFn: ({ id }: { id: string; action?: "accept" | "reject" }) =>
      api.get<PendingDetail>(`/intake/submissions/${id}?kind=${kind}`),
    onSuccess: (response, variables) => {
      setDetail(response);
      setAnswers(response.data);
      setError("");
      setTarget(response.id);
      setConfirm(variables.action ?? null);
    },
    onError: (err) =>
      toast.error(
        getToastErrorMessage(err, "Could not open the registration."),
      ),
  });
  const review = useMutation({
    mutationFn: (action: "accept" | "reject") =>
      action === "accept"
        ? api.post(`/intake/submissions/${target}/accept?kind=${kind}`, {
            data: answers,
          })
        : api.delete(`/intake/submissions/${target}?kind=${kind}`),
    onSuccess: async (_, action) => {
      toast.success(
        action === "accept"
          ? "Registration accepted"
          : "Registration permanently deleted",
      );
      setConfirm(null);
      setTarget(null);
      setDetail(null);
      setError("");
      // Return to the first page after a removal to avoid an empty final page.
      setPage(1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["intake-list"] }),
        queryClient.invalidateQueries({ queryKey: ["intake-count"] }),
        queryClient.invalidateQueries({ queryKey: ["members-list"] }),
        queryClient.invalidateQueries({ queryKey: ["visitors-list"] }),
        queryClient.invalidateQueries({ queryKey: ["visitors-stats"] }),
      ]);
    },
    onError: (err) => {
      setConfirm(null);
      setError(
        getToastErrorMessage(
          err,
          "Could not finish this review. The registration is still pending.",
        ),
      );
    },
  });
  async function refreshRegisters() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["intake-list"] }),
      queryClient.invalidateQueries({ queryKey: ["intake-count"] }),
      queryClient.invalidateQueries({ queryKey: ["members-list"] }),
      queryClient.invalidateQueries({ queryKey: ["visitors-list"] }),
      queryClient.invalidateQueries({ queryKey: ["visitors-stats"] }),
    ]);
  }
  const manageActions = (row: PendingRow) => [
    { label: "Approve", icon: <Check />, disabled: inspect.isPending,
      onSelect: () => inspect.mutate({ id: row.id, action: "accept" }),
      bulk: { key: "approve", label: "Approve selected", description: `Approved registrations are added to the ${kind === "members" ? "member" : "visitor"} register for their original branch.`, run: async () => {
        const response = await api.get<PendingDetail>(`/intake/submissions/${row.id}?kind=${kind}`);
        await api.post(`/intake/submissions/${row.id}/accept?kind=${kind}`, { data: response.data });
        await refreshRegisters();
      } } },
    { label: "Decline", icon: <X />, tone: "danger" as const, disabled: inspect.isPending,
      onSelect: () => inspect.mutate({ id: row.id, action: "reject" }),
      bulk: { key: "decline", label: "Decline selected permanently", destructive: true, description: "The selected pending responses will be permanently removed and cannot be recovered.", run: async () => {
        await api.delete(`/intake/submissions/${row.id}?kind=${kind}`); await refreshRegisters();
      } } },
    { label: "View", icon: <Eye />, disabled: inspect.isPending, onSelect: () => inspect.mutate({ id: row.id }) },
  ];
  if (!access.review) return <>{children}</>;
  const name = `${answers.firstName ?? ""} ${answers.lastName ?? ""}`.trim();
  const hasFilters = !!searchInput.trim() || !!branchId;
  const scopeName = profile?.isAdminHq
    ? branchId
      ? branches.data?.data.find((branch) => branch.branchId === branchId)?.name ?? "Selected branch"
      : "All branches"
    : profile?.branch?.name ?? "Your branch";
  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setBranchId("");
    setPage(1);
  }
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <TabsList>
        <TabsTrigger value="records">Records</TabsTrigger>
        <TabsTrigger value="pending">
          Pending registrations{count.data ? ` (${count.data.meta.total})` : ""}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="records" className="space-y-6">
        {children}
      </TabsContent>
      <TabsContent value="pending" className="space-y-6 min-w-0">
        <section aria-label="Pending registration summary" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {count.isLoading ? <Skeleton className="h-32 rounded-2xl" /> : count.isError ? (
            <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5"><span className="rule-label">Awaiting review</span><Button size="sm" variant="ghost" className="w-fit rounded-full text-xs" onClick={() => void count.refetch()}>Retry count</Button></div>
          ) : (
            <StatCard label="Awaiting review" value={count.data?.meta.total ?? 0} tone="brand" icon={<ClipboardList className="size-4" />} deltaLabel={`${kind === "members" ? "Member" : "Visitor"} registrations`} />
          )}
          <div className="paper-card flex h-full flex-col justify-between gap-4 rounded-2xl p-5">
            <span className="rule-label">On this page</span>
            {list.isLoading ? <Skeleton className="h-8 w-12" /> : <span className="num font-display text-[1.9rem] font-semibold leading-none tracking-tight">{list.isError ? "—" : list.data?.data.length ?? 0}</span>}
          </div>
          <div className="paper-card col-span-2 flex h-full flex-col justify-between gap-4 rounded-2xl p-5 lg:col-span-1">
            <span className="rule-label">Scope</span>
            <span className="font-display text-lg font-semibold leading-tight">{scopeName}</span>
          </div>
        </section>
        <div aria-label="Pending registration filters" role="group" className="flex flex-wrap items-center gap-2">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name, email or phone…"
            className="w-full max-w-xs"
          />
          <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
            {profile?.isAdminHq && (
              <Select value={branchId || "all"} onValueChange={(value) => { setBranchId(value === "all" ? "" : value); setPage(1); }}>
                <SelectTrigger aria-label="Filter registrations by branch" data-prefix-icon="building" className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none" disabled={branches.isLoading || branches.isError}>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {(branches.data?.data ?? []).map((branch) => <SelectItem key={branch.branchId} value={branch.branchId}>{branch.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(1); }}>
              <SelectTrigger aria-label="Sort registrations" data-prefix-icon="none" className="h-8 w-32 rounded-full border-line bg-card text-[11px] shadow-none">
                <ArrowUpDown className="size-3 shrink-0" /> <SelectValue />
              </SelectTrigger>
              <SelectContent>{[["createdAt", "Date added"], ["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"], ["branch", "Branch"]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <SortDirectionToggle ascending={sortOrder === "asc"} onToggle={() => { setSortOrder((order) => order === "asc" ? "desc" : "asc"); setPage(1); }} />
            {hasFilters && <Button size="sm" variant="ghost" className="h-8 rounded-full text-[11px]" onClick={clearFilters}>Clear filters</Button>}
          </div>
        </div>
        {profile?.isAdminHq && branches.isError && <p role="alert" className="text-xs text-destructive">Could not load branch filters. <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => void branches.refetch()}>Retry branches</Button></p>}
        {list.isLoading ? (
          <LoadingState label="Loading registrations" variant="table" />
        ) : list.isError ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Couldn’t load registrations"
            description="The review queue could not be loaded. Please try again."
            action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => void list.refetch()}>Retry</Button>}
          />
        ) : (
          <div className="paper-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <ListTable tableId={`pending-${kind}`} label={`Pending ${kind} registrations`} className="min-w-[720px]" records={list.data?.data ?? []} recordKey="id" fields={list.data?.fields ?? count.data?.fields}>
                <div className="rule-label grid grid-cols-[minmax(0,2fr)_1.2fr_1fr_1fr_auto] items-center gap-4 border-b border-line px-5 py-2.5">
                  <span>Person</span><span>Contact</span><span>Branch</span><span>Submitted</span><ManageHeading />
                </div>
                <div className="divide-y divide-line/70">
                  {list.data?.data.map((row) => {
                    const person = `${row.data.firstName ?? ""} ${row.data.lastName ?? ""}`.trim();
                    return <div key={row.id} className="group grid grid-cols-[minmax(0,2fr)_1.2fr_1fr_1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
                      <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => inspect.mutate({ id: row.id })}>
                        <PersonAvatar name={person} size="sm" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{person}</span><span className="block truncate text-[11px] text-ink-faint">{String(row.data.email ?? row.data.phone ?? "No contact on file")}</span></span>
                      </button>
                      <span className="text-[11px] text-ink-soft"><span className="block truncate">{String(row.data.phone ?? row.data.whatsappNumber ?? "—")}</span><span className="block truncate text-ink-faint">{String(row.data.email ?? "")}</span></span>
                      <span className="truncate text-[11px] text-ink-soft">{row.branchName}</span>
                      <span className="num text-[11px] text-ink-soft">{new Date(row.createdAt).toLocaleDateString()}</span>
                      <RowActions reveal={false} actions={manageActions(row)} />
                    </div>;
                  })}
                </div>
                {!list.data?.data.length && <p className="p-8 text-center text-sm text-muted-foreground">No pending registrations{search ? " match your search" : ""}.</p>}
              </ListTable>
            </div>
            <ListPaginationFooter
              page={page}
              perPage={limit}
              total={list.data?.meta.total ?? 0}
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
              itemName="registrations"
              pending={list.isFetching}
            />
          </div>
        )}
      </TabsContent>
      <Dialog
        open={!!target && !confirm}
        onOpenChange={(open) => {
          if (!open && !review.isPending) {
            setTarget(null);
            setError("");
          }
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review registration</DialogTitle>
            <DialogDescription>
              {detail?.branchName} · Check and correct these details before
              accepting.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <FormFieldsRenderer
              key={detail.id}
              fields={detail.fields}
              validateRequired={!!error}
              initialValues={answers}
              disabled={review.isPending}
              onChange={setAnswers}
              showOptional
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={review.isPending}
              onClick={() => setConfirm("reject")}
            >
              Decline registration
            </Button>
            <Button
              disabled={review.isPending}
              onClick={() => setConfirm("accept")}
            >
              Approve registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !review.isPending) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "accept"
                ? "Accept registration?"
                : "Permanently reject registration?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "accept"
                ? `Add ${name} to ${detail?.branchName}’s ${kind === "members" ? "member" : "visitor"} register?`
                : `Permanently delete ${name}’s registration? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={review.isPending}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant={confirm === "reject" ? "destructive" : "default"}
              disabled={review.isPending}
              onClick={() => confirm && review.mutate(confirm)}
            >
              {review.isPending
                ? "Processing…"
                : confirm === "accept"
                  ? "Confirm acceptance"
                  : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
