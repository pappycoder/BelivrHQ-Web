"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionTooltip } from "@/components/ui/tooltip";

interface AuthFieldProps extends Omit<React.ComponentProps<"input">, "type"> {
  label: string;
  icon?: React.ReactNode;
  type?: "email" | "tel" | "text" | "password" | "url";
}

export function AuthField({
  label,
  icon,
  type = "text",
  id,
  className,
  ...props
}: AuthFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const isPassword = type === "password";
  const [show, setShow] = React.useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} required={props.required}>{label}</Label>
      <div className="relative">
        {icon && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {icon}
          </span>
        )}
        <Input
          id={fieldId}
          type={isPassword ? (show ? "text" : "password") : type}
          className={cn(
            "h-12 rounded-xl border-border bg-card/60 shadow-none transition-colors focus-visible:bg-background",
            icon && "pl-9",
            isPassword && "pr-10",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <ActionTooltip label={show ? "Hide password" : "Show password"}>
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </ActionTooltip>
        )}
      </div>
    </div>
  );
}
