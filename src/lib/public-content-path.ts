import { LEGAL_LINKS } from "@/lib/legal/company";
import { isPublicHelpPath } from "@/lib/help/paths";

/** Public pages stay usable while session restoration or expiry completes. */
export function isPublicContentPath(path: string) {
  return LEGAL_LINKS.some((link) => path === link.href || path === `${link.href}/`) || /^\/accept-invitation\/?$/.test(path) || isPublicHelpPath(path) || /^\/(?:forms|register)\/public\/[^/]+\/?$/.test(path);
}
