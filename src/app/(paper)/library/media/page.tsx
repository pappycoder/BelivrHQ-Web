"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Archive,
  FileText,
  Film,
  FolderOpen,
  ImageIcon,
  Link2,
  Music,
  Search,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  SearchField,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useMediaLibrary,
  useMediaFolders,
  useDeleteMediaAsset,
  useUpdateMediaPermissions,
  useUploadMediaFile,
  classifyMime,
  mimePrefixForKind,
  formatBytes,
  formatDate,
  MEDIA_PERMISSION_LABELS,
  MEDIA_UPLOAD_LIMITS,
  type MediaAsset,
  type MediaKind,
} from "@/hooks/use-media";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

const KIND_TABS: { value: MediaKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "document", label: "Docs" },
];

const KIND_ICON: Record<MediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Film,
  document: FileText,
};

const PERM_TONES: Record<MediaAsset["permissions"], "moss" | "sky" | "gold"> = {
  public: "moss",
  members: "sky",
  leadership: "gold",
};

export default function MediaLibraryPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-64 rounded-2xl" /></div>}>
      <MediaInner />
    </Suspense>
  );
}

function MediaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, ready } = usePermissions();
  const canUpload = ready && can("media", "create");
  const canUpdate = ready && can("media", "update");
  const canDelete = ready && can("media", "delete");

  const [kind, setKind] = React.useState<MediaKind | "all">("all");
  const [folder, setFolder] = React.useState(searchParams.get("folder") ?? "all");
  const [permissions, setPermissions] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [preview, setPreview] = React.useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MediaAsset | null>(null);
  const [permTarget, setPermTarget] = React.useState<MediaAsset | null>(null);
  const [permValue, setPermValue] = React.useState<MediaAsset["permissions"]>("members");
  const [uploadOpen, setUploadOpen] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const folders = useMediaFolders();
  const list = useMediaLibrary({
    page,
    limit: perPage,
    folder: folder === "all" ? undefined : folder,
    mimeType: mimePrefixForKind(kind),
    permissions: permissions ? (permissions as MediaAsset["permissions"]) : undefined,
    search: search || undefined,
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const del = useDeleteMediaAsset();
  const updatePerms = useUpdateMediaPermissions();

  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const folderList = folders.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · Media"
        title="The church&apos;s visual memory."
        description="Pictures, recordings and documents — organised by what the team actually reaches for."
        actions={
          <>
            <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
              <Link href="/library/media/folders">
                <FolderOpen className="size-3.5" /> Folders
              </Link>
            </Button>
            {canUpload ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setUploadOpen(true)}>
                <UploadCloud className="size-3.5" /> Upload
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Files matched" value={total} tone="brand" icon={<ImageIcon className="size-4" />} deltaLabel={folder === "all" ? "all folders" : folder} />
        <StatCard label="Folders" value={folderList.length} tone="moss" />
        <StatCard label="This page" value={rows.length} tone="sky" deltaLabel={`page ${page}/${totalPages}`} />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Limits</span>
          <span className="num text-sm font-semibold">{formatBytes(MEDIA_UPLOAD_LIMITS.imageBytes)} images · {formatBytes(MEDIA_UPLOAD_LIMITS.fileBytes)} files</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search filenames…" className="w-full max-w-[220px]" />
        {KIND_TABS.map((t) => (
          <FilterChip key={t.value} active={kind === t.value} onClick={() => { setKind(t.value); setPage(1); }}>{t.label}</FilterChip>
        ))}
        <select value={folder} onChange={(e) => { setFolder(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none">
          <option value="all">All folders</option>
          {folderList.map((f) => <option key={f.folder} value={f.folder}>{f.folder}</option>)}
        </select>
        <select value={permissions} onChange={(e) => { setPermissions(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none" aria-label="Visibility filter">
          <option value="">Any visibility</option>
          <option value="public">Public</option>
          <option value="members">Members</option>
          <option value="leadership">Leadership</option>
        </select>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-ink-faint"><ShieldCheck className="size-3" /> signed-in members only, per badge</span>
      </div>

      {list.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="Nothing in this view"
          description="Upload from the door of the week&apos;s memories, or loosen the filters."
        />
      ) : (
        <>
          <StaggerGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((asset) => {
              const kindOf = classifyMime(asset.mimeType);
              const Icon = KIND_ICON[kindOf];
              return (
                <StaggerItem key={asset.assetId}>
                  <button
                    type="button"
                    onClick={() => setPreview(asset)}
                    className={cn(
                      "paper-card lift group w-full overflow-hidden rounded-2xl text-left",
                      folder !== "all" && "ring-1 ring-brand/30",
                    )}
                  >
                    {kindOf === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.filename} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <span className="relative flex aspect-[4/3] items-end p-3" style={{ background: "linear-gradient(150deg, var(--paper-deep), var(--muted))" }}>
                        <Icon className="absolute left-3 top-3 size-4 text-ink-faint" />
                      </span>
                    )}
                    <span className="block px-3 pb-2 pt-2">
                      <span className="block truncate text-[11px] font-medium">{asset.filename}</span>
                      <span className="mt-1 flex items-center justify-between">
                        <Tag tone={PERM_TONES[asset.permissions]}>{MEDIA_PERMISSION_LABELS[asset.permissions]}</Tag>
                        <span className="num text-[9px] text-ink-faint">{formatBytes(asset.sizeBytes)} · {formatDate(asset.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
          <div className="paper-card rounded-2xl">
            <ListPaginationFooter
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              perPageOptions={[12, 24, 48]}
              itemName="files"
              pending={list.isFetching}
            />
          </div>
        </>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="rounded-2xl border-line bg-card sm:max-w-[620px]">
          {preview ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-base">{preview.filename}</DialogTitle>
                <DialogDescription className="text-xs">
                  {preview.folder} · {formatBytes(preview.sizeBytes)} · {MEDIA_PERMISSION_LABELS[preview.permissions]} · {formatDate(preview.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <MediaPreviewBody asset={preview} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" onClick={() => { navigator.clipboard?.writeText(preview.url).catch(() => undefined); toast("Link copied."); }}>
                  <Link2 className="size-3.5" /> Copy link
                </Button>
                <a href={preview.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" asChild>
                    <span><Archive className="size-3.5" /> Open original</span>
                  </Button>
                </a>
                {canUpdate ? (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" onClick={() => { setPermTarget(preview); setPermValue(preview.permissions); }}>
                    <ShieldCheck className="size-3.5" /> Visibility
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button size="sm" variant="outline" className="h-8 rounded-full border-line bg-card text-xs text-destructive" onClick={() => { setDeleteTarget(preview); setPreview(null); }}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!permTarget} onOpenChange={(v) => !v && setPermTarget(null)}>
        <DialogContent className="rounded-2xl border-line bg-card">
          <DialogHeader>
            <DialogTitle className="font-display">Who can see {permTarget?.filename}</DialogTitle>
            <DialogDescription className="text-xs">Public links work anywhere; members and leadership need a signed-in session.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {(["public", "members", "leadership"] as const).map((p) => (
              <FilterChip key={p} active={permValue === p} onClick={() => setPermValue(p)}>
                {MEDIA_PERMISSION_LABELS[p]}
              </FilterChip>
            ))}
          </div>
          <Button
            className="h-10 w-full rounded-lg text-sm"
            disabled={updatePerms.isPending || !permTarget || permTarget.permissions === permValue}
            onClick={() => {
              if (!permTarget) return;
              updatePerms.mutate(
                { assetId: permTarget.assetId, permissions: permValue },
                { onSuccess: () => { toast("Visibility updated."); setPermTarget(null); }, onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't change permissions.")) },
              );
            }}
          >
            Save visibility
          </Button>
        </DialogContent>
      </Dialog>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} folders={folderList.map((f) => f.folder)} />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this file?"
        description={deleteTarget ? `${deleteTarget.filename} will be removed from the library — anything already embedded in a sermon keeps its stored copy until re-saved.` : ""}
        confirmLabel="Delete"
        pending={del.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.assetId, {
            onSuccess: () => { toast("File deleted."); setDeleteTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't delete it.")),
          });
        }}
      />

      <p className="text-center text-[10px] text-ink-faint">
        Files are church-owned and branch-scoped where assigned. <button type="button" onClick={() => router.push("/library/media/folders")} className="text-brand hover:underline">Manage folders</button>.
      </p>
    </div>
  );
}

function MediaPreviewBody({ asset }: { asset: MediaAsset }) {
  const kind = classifyMime(asset.mimeType);
  if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset.url} alt={asset.filename} className="max-h-[50vh] w-full rounded-xl object-contain" />;
  }
  if (kind === "audio") return <audio controls autoPlay preload="metadata" src={asset.url} className="w-full" />;
  if (kind === "video") return <video controls preload="metadata" src={asset.url} className="max-h-[50vh] w-full rounded-xl bg-ink" />;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-10">
      <FileText className="size-6 text-ink-faint" />
      <a href={asset.url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">Open document</a>
    </div>
  );
}

function UploadDialog({ open, onOpenChange, folders }: { open: boolean; onOpenChange: (o: boolean) => void; folders: string[] }) {
  const upload = useUploadMediaFile();
  const [files, setFiles] = React.useState<File[]>([]);
  const [folder, setFolder] = React.useState("uploads");
  const [newFolder, setNewFolder] = React.useState("");
  const [done, setDone] = React.useState(0);

  React.useEffect(() => { if (open) { setFiles([]); setDone(0); } }, [open]);

  const target = newFolder.trim() || folder;

  const submit = async () => {
    if (!files.length) { toast.error("Choose files first."); return; }
    setDone(0);
    let failed = 0;
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const limit = isImage ? MEDIA_UPLOAD_LIMITS.imageBytes : MEDIA_UPLOAD_LIMITS.fileBytes;
      if (file.size > limit) {
        toast.error(`${file.name} is over the ${isImage ? "image" : "file"} limit.`);
        failed++;
        continue;
      }
      try {
        await upload.mutateAsync({ file, folder: target });
      } catch {
        failed++;
      }
      setDone((d) => d + 1);
    }
    if (failed === 0) {
      toast.success(`Uploaded ${files.length} file${files.length === 1 ? "" : "s"} to ${target}.`);
      onOpenChange(false);
    } else {
      toast(`${files.length - failed} uploaded, ${failed} failed — retry the rest.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-line bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">Upload to the library</DialogTitle>
          <DialogDescription className="text-xs">Images are optimised automatically; audio, video and documents go straight to the folder&apos;s store.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-muted/20 py-8 text-center transition-colors hover:border-brand/40">
            <UploadCloud className="size-6 text-ink-faint" />
            <span className="text-xs font-medium">Choose files</span>
            <span className="text-[10px] text-ink-faint">JPG/PNG → WebP · audio/video/docs up to 50 MB</span>
            <input
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length ? (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-line p-2 text-[11px]">
              {files.map((f) => (
                <p key={f.name} className="flex items-center justify-between">
                  <span className="truncate">{f.name}</span>
                  <span className="num text-ink-faint">{formatBytes(f.size)}</span>
                </p>
              ))}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Folder</Label>
              <select value={folder} onChange={(e) => setFolder(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                {Array.from(new Set(["uploads", ...folders])).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">…or new folder</Label>
              <Input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="Advent 2026" className="h-10 rounded-lg border-line bg-background text-xs shadow-none" />
            </div>
          </div>
          <div>
            {upload.isPending ? <p className="num mb-1 text-[10px] text-ink-faint">{done}/{files.length} uploaded…</p> : null}
            <Button className="h-10 w-full gap-2 rounded-lg text-sm" onClick={submit} disabled={upload.isPending}>
              <UploadCloud className="size-4" /> Upload {files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
