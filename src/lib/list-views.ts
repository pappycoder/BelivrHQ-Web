export type SavedListView = { id: string; name: string; values: Record<string, string | number | boolean> };
export function listViewStorageKey(churchId: string, profileId: string, route: string) {
  return `belivrhq:list-views:v1:${churchId}:${profileId}:${route}`;
}
/** Treat browser storage as untrusted, bounded preferences, never a query/permission source. */
export function parseListViews(value: unknown): SavedListView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item.id !== "string" || !item.id || item.id.length > 100 || typeof item.name !== "string" || !item.name.trim() || !item.values || typeof item.values !== "object" || Array.isArray(item.values)) return [];
    const values = Object.fromEntries(Object.entries(item.values).filter(([key, v]) => key.length <= 100 && !key.endsWith("page") && (typeof v === "boolean" || (typeof v === "string" && v.length <= 1000) || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10000)))) as SavedListView["values"];
    return [{ id: item.id, name: item.name.trim().slice(0,70), values }];
  }).slice(0,12);
}
