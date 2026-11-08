"use client";

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
  ListPaginationFooter,
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
    queryKey: ["intake-list", kind, search, page, limit, branchId],
    enabled: access.review && tab === "pending",
    queryFn: () =>
      fetchPending(
        `/intake/submissions?${new URLSearchParams({ kind, search, page: String(page), limit: String(limit), ...(branchId ? { branchId } : {}) })}`,
      ),
  });
  const [target, setTarget] = useState<string | null>(null);
  const [detail, setDetail] = useState<PendingDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [confirm, setConfirm] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const inspect = useMutation({
    mutationFn: (id: string) =>
      api.get<PendingDetail>(`/intake/submissions/${id}?kind=${kind}`),
    onSuccess: (response) => {
      setDetail(response);
      setAnswers(response.data);
      setError("");
      setTarget(response.id);
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
  if (!access.review) return <>{children}</>;
  const name = `${answers.firstName ?? ""} ${answers.lastName ?? ""}`.trim();
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
      <TabsContent value="pending" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search registrations…"
          />
          {profile?.isAdminHq && (
            <label className="flex items-center gap-2 text-sm">
              Branch
              <select
                aria-label="Filter registrations by branch"
                className="h-9 rounded-md border bg-background px-3"
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All branches</option>
                {branches.data?.data.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {list.isLoading ? (
          <LoadingState label="Loading registrations" variant="table" />
        ) : list.isError ? (
          <div role="alert">
            Could not load registrations.{" "}
            <Button variant="outline" onClick={() => void list.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="paper-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="rule-label border-b border-line">
                    <th className="p-4">Name</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Branch</th>
                    <th className="p-4">Submitted</th>
                    <th className="p-4">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.data.map((row) => (
                    <tr key={row.id} className="border-b border-line">
                      <td className="p-4">
                        {String(row.data.firstName ?? "")}{" "}
                        {String(row.data.lastName ?? "")}
                      </td>
                      <td className="p-4">
                        <div>{String(row.data.email ?? "")}</div>
                        <div>
                          {String(
                            row.data.phone ?? row.data.whatsappNumber ?? "",
                          )}
                        </div>
                      </td>
                      <td className="p-4">{row.branchName}</td>
                      <td className="whitespace-nowrap p-4">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={inspect.isPending}
                          onClick={() => inspect.mutate(row.id)}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!list.data?.data.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No pending registrations
                        {search ? " match your search" : ""}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
        open={!!target}
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
              initialValues={detail.data}
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
              Reject registration
            </Button>
            <Button
              disabled={review.isPending}
              onClick={() => setConfirm("accept")}
            >
              Accept registration
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
