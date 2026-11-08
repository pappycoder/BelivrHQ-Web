"use client";

import { useState } from "react";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useCellGroup } from "@/hooks/use-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { useCellGroupGiving, useRecordCellGroupGiving } from "@/hooks/use-giving";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { TableCard } from "@/components/shared/table-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { Banknote, CalendarDays } from "lucide-react";

const money = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value);

export function CellGroupGivingPanel({ groupId, archived = false }: { groupId: string; archived?: boolean }) {
  const { canAny } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const { data: group } = useCellGroup(canAny("cell_groups:giving:create") ? groupId : "");
  const ownOnly = canAny("cell_groups:own:read", "cell_groups:own:update") && !canAny("cell_groups:delete");
  const canRecord = canAny("cell_groups:giving:create") && !archived &&
    (!ownOnly || (!!profile?.memberId && group?.leaderId === profile.memberId));
  const [page, setPage] = useState(1);
  const query = useCellGroupGiving(groupId, page);
  const mutation = useRecordCellGroupGiving(groupId);
  const [open, setOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [notes, setNotes] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!meetingDate || !categoryId || !Number.isFinite(Number(amount)) || Number(amount) < 1) return;
    try {
      await mutation.mutateAsync({ categoryId, amount: Number(amount), type: method, cellGroupMeetingDate: meetingDate, notes: notes.trim() || undefined });
      toast.success("Meeting giving recorded"); setOpen(false); setPage(1);
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "Please try again.";
      toast.error("Could not record meeting giving", { description: message });
    }
  };
  if (query.isLoading) return <LoadingState label="Loading group giving" variant="table" rows={3} />;
  if (query.error) return <ErrorState title="Could not load group giving" onRetry={() => void query.refetch()} />;
  const data = query.data;
  return <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="size-4" /> Total group giving</div><p className="mt-2 text-2xl font-semibold">{money(data?.summary.allTimeTotal ?? 0)}</p></div>
      <div className="rounded-xl border bg-card p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> Meetings recorded</div><p className="mt-2 text-2xl font-semibold">{data?.summary.count ?? 0}</p></div>
    </div>
    <TableCard title="Meeting Giving" description="One combined giving total per cell group meeting." action={canRecord ? <Button onClick={() => { setMeetingDate(""); setCategoryId(""); setAmount(""); setNotes(""); setMethod("cash"); setOpen(true); }}>Record Meeting Giving</Button> : undefined} itemName="meetings" page={page} perPage={15} total={data?.total ?? 0} onPageChange={setPage}>
      {data?.data.length ? <Table exportable><TableHeader><TableRow><TableHead>Meeting</TableHead><TableHead>Category</TableHead><TableHead>Receipt</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Group total</TableHead></TableRow></TableHeader><TableBody>{data.data.map((record) => <TableRow key={record.transactionId}><TableCell>{record.cellGroupMeetingDate ?? "—"}</TableCell><TableCell>{record.categoryName}</TableCell><TableCell>{record.receiptNumber ?? "—"}</TableCell><TableCell>{record.type === "cash" ? "Cash" : "Bank transfer"}</TableCell><TableCell className="text-right">{money(record.amount)}</TableCell></TableRow>)}</TableBody></Table> : <EmptyState icon={<Banknote className="size-6" />} title="No meeting giving recorded" description="Combined meeting totals will appear here after they are recorded." />}
    </TableCard>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Record Meeting Giving</DialogTitle><DialogDescription>Enter the combined amount collected for one meeting. A meeting can only be recorded once.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="group-giving-meeting">Meeting date</Label><Input id="group-giving-meeting" type="date" required value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} disabled={mutation.isPending} /></div>
        <div className="space-y-2"><Label htmlFor="group-giving-amount">Combined group total (NGN)</Label><Input id="group-giving-amount" type="number" required min="1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={mutation.isPending} /></div>
        <div className="space-y-2"><Label>Category</Label><Select value={categoryId || undefined} onValueChange={setCategoryId} disabled={mutation.isPending}><SelectTrigger aria-label="Meeting giving category"><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{(data?.categories ?? []).map((category) => <SelectItem key={category.categoryId} value={category.categoryId}>{category.name}</SelectItem>)}</SelectContent></Select>{data?.categories.length === 0 && <p className="text-sm text-muted-foreground">A treasurer must create a giving category for this branch first.</p>}</div>
        <div className="space-y-2"><Label>Method</Label><Select value={method} onValueChange={(value) => setMethod(value as typeof method)} disabled={mutation.isPending}><SelectTrigger aria-label="Meeting giving method"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank transfer</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="group-giving-notes">Notes</Label><Input id="group-giving-notes" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={mutation.isPending} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button><Button type="submit" loading={mutation.isPending} disabled={!meetingDate || !categoryId || !amount}>Record Group Total</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </div>;
}
