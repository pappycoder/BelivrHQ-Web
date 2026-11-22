export type SearchRailState = { status: "pending" | "success" | "error"; count: number };

/** Only successful, currently permitted categories contribute to the result count. */
export function searchResultsState(expected: string[], rails: Record<string, SearchRailState>) {
  const settled = expected.every((name) => rails[name] && rails[name].status !== "pending");
  const failed = expected.filter((name) => rails[name]?.status === "error");
  const total = expected.reduce((sum, name) => sum + (rails[name]?.status === "success" ? rails[name].count : 0), 0);
  return { settled, failed, total, empty: settled && failed.length === 0 && total === 0 };
}
