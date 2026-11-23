/** Calendar-day grouping in the viewer's local time, including DST boundaries. */
export function notificationPeriod(value: string, now = new Date()): "Today" | "Yesterday" | "Earlier" {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Earlier";
  const key = (day: Date) => `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  if (key(date) === key(now)) return "Today";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  return key(date) === key(yesterday) ? "Yesterday" : "Earlier";
}
