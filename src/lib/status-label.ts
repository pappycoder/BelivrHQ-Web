/** Format a status for display only; callers retain the original API/filter value. */
export function formatStatusLabel(value?: string | null, fallback = "Not available"): string {
  const label = value?.trim()
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : fallback;
}
