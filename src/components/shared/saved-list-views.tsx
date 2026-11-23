"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BookmarkPlus, Trash2 } from "lucide-react";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useRegisteredListFilters } from "@/hooks/use-list-filter-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { listViewStorageKey, parseListViews, type SavedListView } from "@/lib/list-views";
import { toast } from "@/lib/toast";
type SavedView = SavedListView;
export function SavedListViews() {
  const filters = useRegisteredListFilters();
  return filters.available ? <AccountSavedListViews /> : null;
}
function AccountSavedListViews() {
  const path = usePathname();
  const { data: profile } = useCurrentProfile();
  const filters = useRegisteredListFilters();
  const key = profile ? listViewStorageKey(profile.churchId, profile.profileId, path) : "";
  const [views, setViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    setSelected(""); setViews([]); if (!key) return;
    try { setViews(parseListViews(JSON.parse(localStorage.getItem(key) ?? "[]"))); } catch { /* Storage restrictions do not block the list. */ }
  }, [key]);
  if (!filters.available || !key) return null;
  function persist(next: SavedView[]) {
    try { localStorage.setItem(key, JSON.stringify(next)); setViews(next); return true; }
    catch { toast.error("Your browser could not save this view."); return false; }
  }
  return <div className="flex min-w-0 flex-wrap items-center gap-1" data-saved-list-views>
    <select aria-label="Saved list views" className="h-9 min-w-0 max-w-44 rounded-full border border-line bg-card px-3 text-sm" value={selected} onChange={event => { const id = event.target.value; setSelected(id); const view = views.find(v => v.id === id); if (view) filters.apply(view.values); }}>
      <option value="">Saved views</option>{views.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}
    </select>
    <Button ref={trigger} variant="outline" size="icon" className="size-9 rounded-full" aria-label="Save current list view" onClick={() => { setName(""); setOpen(true); }} disabled={views.length >= 12}><BookmarkPlus className="size-4" /></Button>
    {selected && <Button variant="ghost" size="icon" aria-label="Remove saved view" onClick={() => { if (persist(views.filter(view => view.id !== selected))) setSelected(""); }}><Trash2 className="size-4" /></Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}><DialogHeader><DialogTitle>Keep this view</DialogTitle><DialogDescription>Save these filters and display choices for this page on this browser. Views are private to your account.</DialogDescription></DialogHeader>
      <label className="space-y-2 text-sm font-medium">View name<Input value={name} maxLength={70} onChange={event => setName(event.target.value)} placeholder="For example, Active people in Central" /></label>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!name.trim()} onClick={() => { const view = { id: crypto.randomUUID(), name: name.trim(), values: filters.snapshot() }; if (persist([...views, view])) { setSelected(view.id); setOpen(false); toast.success("View saved."); } }}>Save view</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
