/** Public article routes must remain readable without a BelivrHQ session. */
export function isPublicHelpPath(path: string) {
  return path === "/help" || path.startsWith("/help/");
}
