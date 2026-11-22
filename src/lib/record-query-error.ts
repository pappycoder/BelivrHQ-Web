/** API reads throw AuthError objects; transport errors may have no status. */
export function recordErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;
  return typeof error.statusCode === "number" ? error.statusCode : undefined;
}

/** Only an explicit 404 is evidence that a requested record is missing. */
export function isMissingRecordError(error: unknown): boolean {
  return recordErrorStatus(error) === 404;
}
