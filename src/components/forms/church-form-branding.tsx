"use client";
import { IdentityImage } from "@/components/shared/identity-image";
export interface ChurchFormIdentity {
  churchName?: string;
  churchLogoUrl?: string | null;
}
export function ChurchFormBranding({
  churchName,
  churchLogoUrl,
}: ChurchFormIdentity) {
  return (
    <div
      className="flex min-w-0 items-center gap-3"
      data-testid="church-form-branding"
    >
      <IdentityImage src={churchLogoUrl} kind="church" alt={`${churchName || "Church"} logo`} className="size-12 shrink-0 rounded-xl object-contain" />
      {churchName && (
        <span className="break-words text-lg font-semibold">{churchName}</span>
      )}
    </div>
  );
}
