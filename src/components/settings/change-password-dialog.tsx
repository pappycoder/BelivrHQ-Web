"use client";

import { BotProtection } from "@/components/shared/bot-protection";

/**
 * @file Shared change-password dialog used by the profile page and the
 * Security settings tab. Verifies the current password, then sets a new one
 * (minimum 8 characters) via the change-password endpoint.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
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
import { useChangePassword } from "@/hooks/use-profile";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function PasswordInputField({
  show,
  onToggle,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className="pr-10" {...props} />
      <ActionTooltip label={show ? "Hide password" : "Show password"}>
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </ActionTooltip>
    </div>
  );
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changeMutation = useChangePassword();
  const [showFields, setShowFields] = React.useState({ current: false, next: false, confirm: false });
  const toggle = (key: keyof typeof showFields) =>
    setShowFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowFields({ current: false, next: false, confirm: false });
    }
  }, [open, form]);

  const onSubmit = (values: PasswordFormValues) => {
    changeMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully.");
          onOpenChange(false);
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Verify your current password, then choose a new one (minimum 8 characters).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <PasswordInputField
                      {...field}
                      show={showFields.current}
                      onToggle={() => toggle("current")}
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <PasswordInputField
                      {...field}
                      show={showFields.next}
                      onToggle={() => toggle("next")}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <PasswordInputField
                      {...field}
                      show={showFields.confirm}
                      onToggle={() => toggle("confirm")}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <BotProtection path="/auth/password" method="PUT" authenticated />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={changeMutation.isPending} loading={changeMutation.isPending}>
                {changeMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
