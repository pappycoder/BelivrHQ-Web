/** Collection controls receive plural nouns; retain explicit overrides for unusual labels. */
export function collectionLabel(count: number, plural: string, singular?: string): string {
  if (count !== 1) return plural;
  if (singular) return singular;
  return plural.replace(/\b([a-z]+)$/i, word => {
    const irregular: Record<string, string> = { people: "person", children: "child", series: "series", statuses: "status", media: "media" };
    const lower = word.toLowerCase();
    const result = irregular[lower] ?? (lower.endsWith("ies") ? lower.slice(0, -3) + "y"
      : /(?:ches|shes|sses|xes|zes)$/.test(lower) ? lower.slice(0, -2)
      : lower.endsWith("s") && !lower.endsWith("ss") ? lower.slice(0, -1) : lower);
    return /^[A-Z]/.test(word) ? result[0].toUpperCase() + result.slice(1) : result;
  });
}
