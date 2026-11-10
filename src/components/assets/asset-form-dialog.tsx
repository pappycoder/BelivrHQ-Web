"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ErrorState } from "@/components/shared/error-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberCombobox } from "@/components/members/member-combobox";
import { AssetImageField } from "@/components/assets/asset-image-field";
import { useBranchesList } from "@/hooks/use-branches";
import { useDepartmentsList } from "@/hooks/use-admin";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  DEPRECIATION_METHOD_LABELS,
  useAssetCategories,
  useCreateAsset,
  useUpdateAsset,
  type Asset,
  type AssetCondition,
  type AssetStatus,
  type DepreciationMethod,
} from "@/hooks/use-assets";

const assetSchema = z.object({
  assetTag: z.string().trim().min(1, "Asset tag is required").max(50),
  name: z.string().trim().min(1, "Asset name is required").max(200),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  categoryId: z.string().optional(),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  departmentId: z.string().optional(),
  branchId: z.string().trim().min(1, "Select a branch"),
  custodianId: z.string().optional(),
  custodianName: z.string().optional(),
  condition: z.string().optional(),
  status: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number<number>().min(0).optional(),
  currentValue: z.coerce.number<number>().min(0).optional(),
  salvageValue: z.coerce.number<number>().min(0).optional(),
  usefulLifeYears: z.coerce.number<number>().int().min(1).optional(),
  depreciationMethod: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const CONDITION_OPTIONS: Array<{ value: AssetCondition; label: string }> = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
];

const STATUS_OPTIONS: Array<{ value: AssetStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "In Maintenance" },
  { value: "retired", label: "Retired" },
  { value: "lost", label: "Lost" },
  { value: "disposed", label: "Disposed" },
];

const METHOD_OPTIONS: Array<{ value: DepreciationMethod; label: string }> = [
  { value: "straight_line", label: DEPRECIATION_METHOD_LABELS.straight_line },
  {
    value: "reducing_balance",
    label: DEPRECIATION_METHOD_LABELS.reducing_balance,
  },
];

interface AssetFormDialogProps {
  presentation?: "dialog" | "page";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this asset; otherwise it registers a new one. */
  asset?: Asset | null;
  onSaved?: (asset: Asset) => void;
}

function toFormValues(asset?: Asset | null): AssetFormValues {
  return {
    assetTag: asset?.assetTag ?? "",
    name: asset?.name ?? "",
    description: asset?.description ?? "",
    imageUrl: asset?.imageUrl ?? "",
    categoryId: asset?.categoryId ?? "",
    serialNumber: asset?.serialNumber ?? "",
    brand: asset?.brand ?? "",
    model: asset?.model ?? "",
    departmentId: asset?.departmentId ?? "",
    branchId: asset?.branchId ?? "",
    custodianId: asset?.custodianId ?? "",
    custodianName: asset?.custodianName ?? "",
    condition: asset?.condition ?? "good",
    status: asset?.status ?? "active",
    purchaseDate: asset?.purchaseDate ? asset.purchaseDate.slice(0, 10) : "",
    purchasePrice: asset?.purchasePrice ?? undefined,
    currentValue: asset?.currentValue ?? undefined,
    salvageValue: asset?.salvageValue ?? 0,
    usefulLifeYears: asset?.usefulLifeYears ?? undefined,
    depreciationMethod: asset?.depreciationMethod ?? "straight_line",
    location: asset?.location ?? "",
    notes: asset?.notes ?? "",
  };
}

export function AssetFormDialog({
  open,
  presentation = "dialog",
  onOpenChange,
  asset,
  onSaved,
}: AssetFormDialogProps) {
  const isEdit = !!asset;
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset(asset?.id ?? "");
  const categoriesQuery = useAssetCategories();
  const branchesQuery = useBranchesList({ limit: 100 });
  const { data: profile } = useCurrentProfile();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: toFormValues(asset),
  });
  const selectedBranchId = useWatch({
    control: form.control,
    name: "branchId",
  });
  const departmentsQuery = useDepartmentsList({
    branchId: selectedBranchId || undefined,
    enabled: open,
  });

  React.useEffect(() => {
    if (open && !form.formState.isDirty) {
      form.reset(toFormValues(asset));
      if (!profile?.isAdminHq && profile?.branchId) {
        form.setValue("branchId", profile.branchId);
      }
    }
  }, [open, asset, form, profile?.branchId, profile?.isAdminHq]);

  const onSubmit = (values: AssetFormValues) => {
    const payload = {
      assetTag: values.assetTag.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      imageUrl: values.imageUrl?.trim() || undefined,
      categoryId: values.categoryId || undefined,
      serialNumber: values.serialNumber?.trim() || undefined,
      brand: values.brand?.trim() || undefined,
      model: values.model?.trim() || undefined,
      departmentId: values.departmentId || undefined,
      branchId: values.branchId || undefined,
      custodianId: values.custodianId || undefined,
      condition: values.condition as AssetCondition | undefined,
      status: values.status as AssetStatus | undefined,
      purchaseDate: values.purchaseDate || undefined,
      purchasePrice:
        values.purchasePrice === undefined || values.purchasePrice === 0
          ? undefined
          : values.purchasePrice,
      currentValue:
        values.currentValue === undefined || values.currentValue === 0
          ? undefined
          : values.currentValue,
      salvageValue: values.salvageValue || undefined,
      usefulLifeYears: values.usefulLifeYears || undefined,
      depreciationMethod: values.depreciationMethod as
        DepreciationMethod | undefined,
      location: values.location?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload as never, {
      onSuccess: (saved) => {
        toast.success(
          isEdit
            ? "Asset updated successfully"
            : "Asset registered successfully",
        );
        form.reset(values);
        if (presentation === "dialog") onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => {
        toast.error(
          isEdit ? "Failed to update asset" : "Failed to register asset",
          {
            description: error?.message || "Please try again.",
          },
        );
      },
    });
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  const editor = (
    <Form {...form}>
      <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {(categoriesQuery.error ||
          branchesQuery.error ||
          departmentsQuery.error) && (
          <ErrorState
            title="Some assignment options are unavailable"
            description="Retry to load categories, branches and departments. Your entered asset details are preserved."
          />
        )}
        <fieldset className="space-y-4 rounded-lg border p-5">
          <legend className="px-2">
            <h2 className="text-lg font-semibold">Identity and description</h2>
          </legend>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField required
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Yamaha Mixer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField required
              control={form.control}
              name="assetTag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Tag *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AUD-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(categoriesQuery.data ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Yamaha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MG16XU" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SN123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short description of the asset"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <AssetImageField
                value={form.watch("imageUrl")}
                onChange={(url) =>
                  form.setValue("imageUrl", url ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>
          </div>
        </fieldset>
        <fieldset className="space-y-4 rounded-lg border p-5">
          <legend className="px-2">
            <h2 className="text-lg font-semibold">Assignment and location</h2>
          </legend>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField required
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const nextBranchId = value === "all" ? "" : value;
                      if (nextBranchId !== field.value) {
                        form.setValue("departmentId", "");
                      }
                      field.onChange(nextBranchId);
                    }}
                    value={
                      field.value || (profile?.isAdminHq ? "all" : undefined)
                    }
                    disabled={!profile?.isAdminHq}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profile?.isAdminHq && (
                        <SelectItem value="all">All branches</SelectItem>
                      )}
                      {(branchesQuery.data?.data ?? []).map((branch) => (
                        <SelectItem
                          key={branch.branchId}
                          value={branch.branchId}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(departmentsQuery.data ?? []).map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="custodianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custodian</FormLabel>
                  <FormControl>
                    <MemberCombobox
                      value={field.value ?? ""}
                      onChange={(memberId, member) => {
                        field.onChange(memberId || undefined);
                        form.setValue(
                          "custodianName",
                          member
                            ? `${member.firstName} ${member.lastName}`
                            : "",
                          { shouldDirty: false, shouldValidate: false },
                        );
                      }}
                      selectedName={form.watch("custodianName") || undefined}
                      placeholder="Select member..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Worship Hall store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </fieldset>
        <fieldset className="space-y-4 rounded-lg border p-5">
          <legend className="px-2">
            <h2 className="text-lg font-semibold">Purchase and valuation</h2>
          </legend>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input picker="wheel" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Price (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="250000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Value (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="200000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salvageValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salvage Value (₦)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="usefulLifeYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Useful Life (years)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="depreciationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depreciation Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {METHOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>
        <fieldset className="space-y-4 rounded-lg border p-5">
          <legend className="px-2">
            <h2 className="text-lg font-semibold">Additional notes</h2>
          </legend>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </fieldset>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? isEdit
                ? "Saving..."
                : "Registering..."
              : isEdit
                ? "Save Changes"
                : "Register Asset"}
          </Button>
        </DialogFooter>
      </ValidatedForm>
    </Form>
  );
  if (presentation === "page") return editor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Asset" : "Register New Asset"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this asset's register details."
              : "Add an asset to your church's register."}
          </DialogDescription>
        </DialogHeader>

        {editor}
      </DialogContent>
    </Dialog>
  );
}
