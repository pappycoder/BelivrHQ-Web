import { cn } from "@/lib/utils";

/** A decorative marker keeps the field's label text and accessible name intact. */
export function RequiredIndicator() {
  return <span aria-hidden="true" className="text-red-600 after:content-['*'] dark:text-red-400" />;
}

export function RequiredFieldsNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <RequiredIndicator /> Fields marked with an asterisk are required.
    </p>
  );
}
