"use client";

import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";

import * as React from "react";
import { useForm } from "react-hook-form";
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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import { useBranchesList } from "@/hooks/use-branches";
import { Button } from "@/components/ui/button";
import { useInviteUser, useUpdateUserRole } from "@/hooks/use-users";
import { useAssignableRoles } from "@/hooks/use-roles";
import type { UserProfile } from "@/hooks/use-users";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  branchId: z.string().min(1, "Select a branch"),
});

const updateRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;
type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "invite" | "edit-role";
  user?: UserProfile;
}

export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  user,
}: UserFormDialogProps) {
  const inviteMutation = useInviteUser();
  const captchaReady = useBotProtectionReady("/profiles/invite");
  const updateRoleMutation = useUpdateUserRole();
  const assignableRoles = useAssignableRoles(mode === "edit-role" ? user?.role : []);
  const { data: profile } = useCurrentProfile();
  const { can } = usePermissions();
  const loadBranches = open && mode === "invite" &&
    profile?.isAdminHq === true && can("branches", "read");
  const branchQuery = useBranchesList({ limit: 100 }, { enabled: loadBranches });
  const branchOptions = React.useMemo(() => {
    if (loadBranches) return branchQuery.data?.data ?? [];
    return profile?.branchId ? [{
      branchId: profile.branchId,
      name: profile.branch?.name ?? "Your branch",
      isHeadquarters: profile.branch?.isHeadquarters ?? false,
    }] : [];
  }, [loadBranches, branchQuery.data, profile?.branchId, profile?.branch?.name, profile?.branch?.isHeadquarters]);

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "",
      branchId: "",
    },
  });

  React.useEffect(() => {
    if (!open || mode !== "invite") return;
    if (!profile?.isAdminHq && profile?.branchId) {
      inviteForm.setValue("branchId", profile.branchId);
    } else if (!inviteForm.getValues("branchId")) {
      const initial = branchOptions.find(branch => branch.branchId === profile?.branchId) ??
        (branchOptions.length === 1 ? branchOptions[0] : undefined);
      if (initial) inviteForm.setValue("branchId", initial.branchId);
    }
  }, [open, mode, inviteForm, branchOptions, profile?.isAdminHq, profile?.branchId]);

  const updateRoleForm = useForm<UpdateRoleFormValues>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      role: user?.role?.[0] || "",
    },
  });

  React.useEffect(() => {
    if (mode === "edit-role" && user) {
      updateRoleForm.reset({ role: user.role?.[0] || "" });
    }
  }, [mode, user, updateRoleForm]);

  React.useEffect(() => {
    if (!open) {
      inviteForm.reset();
      updateRoleForm.reset({ role: user?.role?.[0] || "" });
    }
  }, [open, inviteForm, updateRoleForm, user]);

  const handleInviteSubmit = (values: InviteFormValues) => {
    inviteMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Invitation created", { description: "They’ll receive a ChurchOS email to set their password." });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error("Failed to invite user", {
          description: error?.message || "Please try again.",
        });
      },
    });
  };

  const handleUpdateRoleSubmit = (values: UpdateRoleFormValues) => {
    if (!user) return;
    updateRoleMutation.mutate(
      { profileId: user.profileId, role: values.role },
      {
        onSuccess: () => {
          toast.success("Role updated successfully");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("Failed to update role", {
            description: error?.message || "Please try again.",
          });
        },
      }
    );
  };

  const isPending = inviteMutation.isPending || updateRoleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "invite" ? "Invite User" : "Change Role"}
          </DialogTitle>
          <DialogDescription>
            {mode === "invite"
              ? "Send an invitation to a new user to join your church."
              : `Update the role for ${user?.firstName} ${user?.lastName}`}
          </DialogDescription>
        </DialogHeader>

        {mode === "invite" ? (
          <Form {...inviteForm}>
            <form
              onSubmit={inviteForm.handleSubmit(handleInviteSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={inviteForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending || branchQuery.isLoading || !profile?.isAdminHq}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={branchQuery.isLoading ? "Loading branches..." : "Select a branch"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branchOptions.map(branch => (
                          <SelectItem key={branch.branchId} value={branch.branchId}>
                            {branch.name}{branch.isHeadquarters ? " (HQ)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{profile?.isAdminHq ? "Assign the user’s home branch." : "Users you invite are assigned to your branch."}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {loadBranches && branchQuery.isError && (
                <div role="alert" className="space-y-2 text-sm text-destructive">
                  <p>Could not load branches. Please try again.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void branchQuery.refetch()} disabled={branchQuery.isFetching}>
                    Reload branches
                  </Button>
                </div>
              )}
              <BotProtection path="/profiles/invite" authenticated />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !captchaReady || !profile || branchQuery.isLoading || (loadBranches && branchQuery.isError)}>
                  {isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...updateRoleForm}>
            <form
              onSubmit={updateRoleForm.handleSubmit(handleUpdateRoleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={updateRoleForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Updating..." : "Update Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
