"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const DEFAULT_PERSON_IMAGE = "/images/defaults/person.png";
export const DEFAULT_CHURCH_IMAGE = "/images/defaults/church.png";

/** Uploaded identities keep priority; missing or broken images use bundled artwork. */
export function IdentityImage({ src, alt = "", kind = "person", className }: {
  src?: string | null;
  alt?: string;
  kind?: "person" | "church";
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const fallback = kind === "church" ? DEFAULT_CHURCH_IMAGE : DEFAULT_PERSON_IMAGE;
  const image = src && failedUrl !== src ? src : fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={alt} width={256} height={256}
      className={cn("size-full object-cover", image === fallback && "bg-sky-50 object-contain p-[8%]", className)}
      onError={image !== fallback ? () => setFailedUrl(src ?? null) : undefined} />
  );
}
