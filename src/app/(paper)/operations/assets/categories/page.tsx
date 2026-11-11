"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import Link from "next/link";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { MoreHorizontal, PencilLine, Plus } from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { CategoryFormDialog } from "@/components/assets/category-form-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAssetCategories,
  useArchiveAssetCategory,
  useRestoreAssetCategory,
  useDeleteAssetCategory,
  type AssetCategory,
} from "@/hooks/use-assets";
import { formatDate } from "@/hooks/use-media";

export default function AssetCategoriesPage() {
  const { confirm, dialog } = useManageConfirmation();
  const { can, ready } = usePermissions();
  const canCreate = ready && can("assets:categories", "create");
  const canUpdate = ready && can("assets:categories", "update");
  const canDelete = ready && can("assets:categories", "delete");

  const [archivedView, setArchivedView] = React.useState(false);
  const [formTarget, setFormTarget] = React.useState<{ open: boolean; category: AssetCategory | null }>({ open: false, category: null });
  const [deleteTarget, setDeleteTarget] = React.useState<AssetCategory | null>(null);

  const categories = useAssetCategories(archivedView ? true : undefined);
  const archive = useArchiveAssetCategory();
  const restore = useRestoreAssetCategory();
  const del = useDeleteAssetCategory();

  const rows = categories.data ?? [];

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader
        eyebrow={
          <Link href="/operations/assets" className="flex items-center gap-1.5 hover:text-ink">← Operations · Assets</Link>
        }
        title="Organise your asset register with categories."
        description="Sound, transport and furniture: group assets the way the team already thinks about them."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-sm" onClick={() => setFormTarget({ open: true, category: null })}>
              <Plus className="size-3.5" /> New category
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Categories" value={rows.length} tone="brand" deltaLabel={archivedView ? "archived" : "in rotation"} />
        <StatCard label="In use" value={rows.filter((c) => !c.archivedAt).length} tone="moss" />
        <StatCard label="Recently added" value={rows.filter((c) => c.createdAt >= new Date(Date.now() - 30 * 86_400_000).toISOString()).length} tone="sky" deltaLabel="last 30 days" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={!archivedView} onClick={() => setArchivedView(false)}>Active</FilterChip>
        <FilterChip active={archivedView} onClick={() => setArchivedView(true)}>Archived</FilterChip>
      </div>

      {categories.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Plus />}
          title={archivedView ? "No archived categories" : "No categories yet"}
          description="Categories keep the register readable. Make the first one now."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => setFormTarget({ open: true, category: null })}>Add a category</Button> : undefined}
        />
      ) : (
        <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          {rows.map((category) => (
            <StaggerItem key={category.id}>
              <div className="group flex items-center gap-4 px-5 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand font-display text-sm font-semibold">
                  {category.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{category.name}</span>
                  <span className="block truncate text-xs text-ink-faint">{category.description || `Created ${formatDate(category.createdAt)}`}</span>
                </span>
                {category.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                <div className="flex shrink-0 items-center gap-1">
                  {canUpdate && !category.archivedAt ? (
                    <ActionTooltip label={`Edit ${category.name}`}>
                      <button type="button" onClick={() => setFormTarget({ open: true, category })} className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink">
                        <PencilLine className="size-3.5" />
                      </button>
                    </ActionTooltip>
                  ) : null}
                  {canDelete ? (
                    <DropdownMenu>
                      <ActionTooltip label={`Manage ${category.name}`}>
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label={`Manage ${category.name}`} className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink">
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                      </ActionTooltip>
                      <DropdownMenuContent align="end" className="w-40">
                        {category.archivedAt ? (
                          <DropdownMenuItem className="text-sm" onClick={() => confirm({ title: "Restore category?", subject: category.name, onConfirm: () => restore.mutateAsync(category.id, { onSuccess: () => toast("Category restored."), onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't restore it.")) }) })}>
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-sm" onClick={() => confirm({ title: "Archive category?", subject: category.name, onConfirm: () => archive.mutateAsync(category.id, { onSuccess: () => toast("Category archived."), onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't archive it.")) }) })}>
                            Archive
                          </DropdownMenuItem>
                        )}
                        {!category.archivedAt ? (
                          <DropdownMenuItem className="text-sm text-rose" onClick={() => setDeleteTarget(category)}>Delete</DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <CategoryFormDialog
        open={formTarget.open}
        onOpenChange={(value) => setFormTarget({ open: value, category: value ? formTarget.category : null })}
        category={formTarget.category}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Delete this category?"
        description={deleteTarget ? `${deleteTarget.name} will be removed. Assets already filed under it keep their tag.` : ""}
        confirmLabel="Delete"
        pending={del.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.id, {
            onSuccess: () => { toast("Category deleted."); setDeleteTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't delete it.")),
          });
        }}
      />
    </div>
  );
}
