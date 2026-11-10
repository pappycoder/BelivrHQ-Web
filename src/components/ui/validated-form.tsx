"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import { RequiredFieldsNotice } from "./required-fields";
import { missingRequiredControls } from "@/lib/required-fields";

/** Complements schema validation for native inputs and custom select controls. */
export function ValidatedForm({ children, onSubmit, onChange, schemaValidation = false, ...props }: React.ComponentProps<"form"> & { schemaValidation?: boolean }) {
  const [error, setError] = React.useState("");
  return (
    <form
      {...props}
      noValidate
      onChange={(event) => {
        setError("");
        const missing = new Set(missingRequiredControls(event.currentTarget));
        event.currentTarget.querySelectorAll<HTMLElement>("[data-required-invalid]").forEach((control) => {
          if (!missing.has(control)) {
            control.removeAttribute("aria-invalid");
            delete control.dataset.requiredInvalid;
          }
        });
        onChange?.(event);
      }}
      onSubmit={(event) => {
        if (schemaValidation) {
          onSubmit?.(event);
          return;
        }
        const missing = missingRequiredControls(event.currentTarget);
        event.currentTarget.querySelectorAll<HTMLElement>("[data-required-invalid]").forEach((control) => {
          control.removeAttribute("aria-invalid");
          delete control.dataset.requiredInvalid;
        });
        if (missing.length) {
          event.preventDefault();
          const message = "Please fill in all fields marked with an asterisk (*).";
          setError(message);
          toast.error("Required fields are missing", { description: message });
          missing.forEach((control) => {
            control.setAttribute("aria-invalid", "true");
            control.dataset.requiredInvalid = "true";
          });
          missing[0].focus();
          return;
        }
        if (!event.currentTarget.reportValidity()) {
          event.preventDefault();
          setError("Please check the highlighted fields.");
          return;
        }
        setError("");
        onSubmit?.(event);
      }}
    >
      <div className="col-span-full space-y-1">
        <RequiredFieldsNotice />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      {children}
    </form>
  );
}
