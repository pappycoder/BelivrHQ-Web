import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Same internal header, divider and padded white surface as page form cards. */
export function FormSection({ title, description, children, className, ...props }: Omit<ComponentProps<"fieldset">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
}) {
  const headingId = useId();
  return (
    <fieldset {...props} aria-labelledby={props["aria-labelledby"] ?? headingId} data-form-section className={cn("paper-card min-w-0 overflow-hidden rounded-2xl", className)}>
      <div data-form-section-header className="space-y-1 border-b border-line/80 px-5 py-4">
        <h2 id={headingId} className="font-display text-lg font-semibold leading-tight">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-ink-soft">{description}</p>}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </fieldset>
  );
}
