function searchableText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value).map(searchableText).join(" ");
  return String(value).toLocaleLowerCase();
}
export function searchListRecords<T>(records: readonly T[], query: string): T[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...records];
  return records.filter(record => {
    const text = searchableText(record);
    return terms.every(term => text.includes(term));
  });
}
