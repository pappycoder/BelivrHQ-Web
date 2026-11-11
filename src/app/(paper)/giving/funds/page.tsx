"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  Layers,
  PencilLine,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  RowActions,
} from "@/components/paper/primitives";
import {
  StaggerGroup,
  StaggerItem,
} from "@/components/paper/motion/primitives";
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
  useGivingCategories,
  useCreateGivingCategory,
  useUpdateGivingCategory,
  useArchiveGivingCategory,
  useRestoreArchiveGivingCategory,
  useDeleteGivingCategory,
  type GivingCategory,
} from "@/hooks/use-giving";
import { formatDate } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

const TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function GivingFundsPage() {
  const { can, ready } = usePermissions();
  const canCreate = ready && can("giving", "create");
  const canUpdate = ready && can("giving", "update");
  const canDelete = ready && can("giving", "delete");

  const [archivedView, setArchivedView] = React.useState(false);
  const [formTarget, setFormTarget] = React.useState<{
    open: boolean;
    category: GivingCategory | null;
  }>({ open: false, category: null });
  const [deleteTarget, setDeleteTarget] = React.useState<GivingCategory | null>(
    null,
  );

  const categories = useGivingCategories({
    archived: archivedView ? true : undefined,
    limit: 100,
  });
  const create = useCreateGivingCategory();
  const update = useUpdateGivingCategory();
  const archive = useArchiveGivingCategory();
  const restore = useRestoreArchiveGivingCategory();
  const del = useDeleteGivingCategory();

  const rows = categories.data?.data ?? [];
  const activeCount = rows.filter((c) => !c.archivedAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giving · Categories"
        title="Giving categories."
        description="Organize giving into categories such as tithes, offerings and church projects."
        actions={
          canCreate ? (
            <Button
              className="h-9 gap-1.5 rounded-full text-sm"
              onClick={() => setFormTarget({ open: true, category: null })}
            >
              <Plus className="size-3.5" /> New category
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Categories"
          value={categories.data?.meta?.total ?? rows.length}
          tone="brand"
          icon={<Layers className="size-4" />}
          deltaLabel={archivedView ? "archived" : "defined"}
        />
        <StatCard label="Accepting gifts" value={activeCount} tone="moss" />
        <StatCard
          label="Recurring-ready"
          value={rows.filter((c) => c.isRecurring).length}
          tone="sky"
          deltaLabel="schedules can point here"
        />
        <StatCard
          label="Church-wide"
          value={rows.length}
          tone="gold"
          deltaLabel="shared across branches"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={!archivedView}
          onClick={() => setArchivedView(false)}
        >
          Active
        </FilterChip>
        <FilterChip active={archivedView} onClick={() => setArchivedView(true)}>
          Archived
        </FilterChip>
        <span className="ml-auto text-xs text-ink-faint">
          Names stay unique per church; duplicates merge into the existing
          category.
        </span>
      </div>

      {categories.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet />}
          title={archivedView ? "Nothing archived" : "No giving categories yet"}
          description="Create a category to organize the giving your church receives."
          action={
            canCreate ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-line text-sm"
                onClick={() => setFormTarget({ open: true, category: null })}
              >
                Create the first
              </Button>
            ) : undefined
          }
        />
      ) : (
        <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          {rows.map((category, index) => (
            <StaggerItem key={category.categoryId}>
              <div className="group flex items-center gap-4 px-5 py-3.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: TONES[index % TONES.length] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {category.name}
                    </span>
                    {category.archivedAt ? (
                      <Tag tone="neutral">Archived</Tag>
                    ) : !category.isActive ? (
                      <Tag tone="gold">Paused</Tag>
                    ) : null}
                    {category.isRecurring ? (
                      <Tag tone="sky">recurring</Tag>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-faint">
                    {category.description ||
                      `Opened ${formatDate(category.createdAt)}`}
                  </span>
                </span>
                <RowActions
                  actions={[
                    canUpdate &&
                      !category.archivedAt && {
                        label: `Edit ${category.name}`,
                        icon: <PencilLine />,
                        onSelect: () => setFormTarget({ open: true, category }),
                      },
                    canDelete &&
                      !category.archivedAt && {
                        label: `Archive ${category.name}`,
                        confirmation: { subject: category.name },
                        icon: <Archive />,
                        onSelect: () =>
                          archive.mutateAsync(category.categoryId, {
                            onSuccess: () =>
                              toast(`${category.name} archived.`),
                            onError: (e) =>
                              toast.error(
                                getToastErrorMessage(e, "Couldn't archive it."),
                              ),
                          }),
                      },
                    canUpdate &&
                      category.archivedAt && {
                        label: `Restore ${category.name}`,
                        confirmation: { subject: category.name },
                        icon: <ArchiveRestore />,
                        tone: "success",
                        onSelect: () =>
                          restore.mutateAsync(category.categoryId, {
                            onSuccess: () =>
                              toast(`${category.name} restored.`),
                            onError: () => toast.error("Couldn't restore it."),
                          }),
                      },
                    canDelete &&
                      category.archivedAt && {
                        label: `Delete ${category.name} forever`,
                        icon: <Trash2 />,
                        tone: "danger",
                        onSelect: () => setDeleteTarget(category),
                      },
                  ]}
                />
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <FundFormDialog
        open={formTarget.open}
        onOpenChange={(value) =>
          setFormTarget({
            open: value,
            category: value ? formTarget.category : null,
          })
        }
        category={formTarget.category}
        onSave={(input, existing) => {
          const payload = {
            name: input.name,
            description: input.description || undefined,
            isRecurring: input.isRecurring,
          };
          const done = {
            onSuccess: () => {
              toast(existing ? "Category updated." : "Category created.");
              setFormTarget({ open: false, category: null });
            },
            onError: (e: unknown) =>
              toast.error(
                getToastErrorMessage(e, "Couldn't save the category."),
              ),
          };
          if (existing)
            update.mutate(
              { categoryId: existing.categoryId, input: payload },
              done,
            );
          else create.mutate({ ...payload, isActive: true }, done);
        }}
        pending={create.isPending || update.isPending}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Delete this category?"
        description={
          deleteTarget
            ? `${deleteTarget.name} has been archived. Deleting removes it from future recording. Gifts already given toward it keep their history.`
            : ""
        }
        confirmLabel="Delete forever"
        pending={del.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.categoryId, {
            onSuccess: () => {
              toast("Category deleted.");
              setDeleteTarget(null);
            },
            onError: (e) =>
              toast.error(getToastErrorMessage(e, "Couldn't delete it.")),
          });
        }}
      />
    </div>
  );
}

type FundInput = { name: string; description: string; isRecurring: boolean };

function FundFormDialog({
  open,
  onOpenChange,
  category,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: GivingCategory | null;
  onSave: (input: FundInput, existing: GivingCategory | null) => void;
  pending: boolean;
}) {
  const [form, setForm] = React.useState<FundInput>({
    name: "",
    description: "",
    isRecurring: false,
  });

  React.useEffect(() => {
    if (open)
      setForm({
        name: category?.name ?? "",
        description: category?.description ?? "",
        isRecurring: !!category?.isRecurring,
      });
  }, [open, category]);

  const valid = form.name.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-line bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">
            {category ? `Edit ${category.name}` : "New giving category"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Give this category a clear name and purpose, such as Tithes,
            Offering or Building Fund.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <RequiredFieldsNotice className="col-span-full" />
          <div className="space-y-1.5">
            <Label required className="text-sm">Category name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Building Fund"
              className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Purpose (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What the money is for, in one line"
              className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({ ...f, isRecurring: !f.isRecurring }))
            }
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              form.isRecurring
                ? "border-brand/50 bg-brand-soft/40"
                : "border-line hover:border-ink/20",
            )}
          >
            <span>
              <span className="block font-medium">
                Accepts recurring schedules
              </span>
              <span className="block text-xs text-ink-faint">
                Monthly givers can point their standing order here.
              </span>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
                form.isRecurring
                  ? "bg-brand text-paper"
                  : "bg-muted text-ink-faint",
              )}
            >
              {form.isRecurring ? "on" : "off"}
            </span>
          </button>
          <Button
            className="h-10 w-full rounded-lg text-sm"
            disabled={!valid || pending}
            onClick={() =>
              onSave(
                {
                  name: form.name.trim(),
                  description: form.description.trim(),
                  isRecurring: form.isRecurring,
                },
                category,
              )
            }
          >
            {pending
              ? "Saving…"
              : category
                ? "Save category"
                : "Create category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
