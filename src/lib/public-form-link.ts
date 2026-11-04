/** Mirrors the public metadata endpoint's availability checks. */
export function hasLivePublicFormLink(form: {
  isPublic: boolean;
  publicToken?: string;
  status: string;
  archivedAt?: string;
}) {
  return !!(form.isPublic && form.publicToken && form.status === "published" && !form.archivedAt);
}
