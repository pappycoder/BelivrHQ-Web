export type WheelPickerType = "date" | "time" | "datetime-local";
export function isWheelPickerType(value: unknown): value is WheelPickerType {
  return value === "date" || value === "time" || value === "datetime-local";
}
export type DateTimeParts = {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
};
const pad = (value: number, length = 2) => String(value).padStart(length, "0");
export function daysInMonth(year: number, month: number) {
  return month === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : ([4, 6, 9, 11].includes(month) ? 30 : 31);
}
export function readDateTime(type: WheelPickerType, value: string, now = new Date()): DateTimeParts {
  const parts = {
    year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
    hour: now.getHours(), minute: now.getMinutes(), second: 0,
  };
  const [date, time] = type === "time" ? ["", value] : value.split("T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    const [year, month, day] = date.split("-").map(Number);
    if (year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)) {
      Object.assign(parts, { year, month, day });
    }
  }
  if (/^\d{2}:\d{2}(?::\d{2})?$/.test(time ?? "")) {
    const [hour, minute, second = 0] = time.split(":").map(Number);
    if (hour < 24 && minute < 60 && second < 60) Object.assign(parts, { hour, minute, second });
  }
  return parts;
}
export function updateDateTime(parts: DateTimeParts, key: keyof DateTimeParts, value: number): DateTimeParts {
  const next = { ...parts, [key]: value };
  next.day = Math.min(next.day, daysInMonth(next.year, next.month));
  return next;
}
/** Keep local date/time strings local: no UTC conversion or timezone shift. */
export function writeDateTime(type: WheelPickerType, parts: DateTimeParts, seconds = false) {
  const date = `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
  const time = `${pad(parts.hour)}:${pad(parts.minute)}${seconds ? `:${pad(parts.second)}` : ""}`;
  return type === "date" ? date : type === "time" ? time : `${date}T${time}`;
}
