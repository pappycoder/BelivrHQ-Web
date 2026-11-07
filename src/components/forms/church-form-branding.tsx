"use client";
import { useState } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
export interface ChurchFormIdentity {
  churchName?: string;
  churchLogoUrl?: string | null;
}
export function ChurchFormBranding({
  churchName,
  churchLogoUrl,
}: ChurchFormIdentity) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div
      className="flex min-w-0 items-center gap-3"
      data-testid="church-form-branding"
    >
      {churchLogoUrl ? (
        failedUrl === churchLogoUrl ? (
          <span
            role="img"
            aria-label="Church logo unavailable"
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border text-lg font-semibold"
          >
            {churchName?.slice(0, 1)}
          </span>
        ) : (
          // Church-uploaded logos are already optimized by the media API.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={churchLogoUrl}
            alt={`${churchName || "Church"} logo`}
            className="size-12 shrink-0 object-contain"
            onError={() => setFailedUrl(churchLogoUrl)}
          />
        )
      ) : (
        <BrandLogo variant="mark" emblemClassName="h-10 w-10" />
      )}
      {churchName && (
        <span className="break-words text-lg font-semibold">{churchName}</span>
      )}
    </div>
  );
}
