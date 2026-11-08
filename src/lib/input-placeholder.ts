/** Placeholder copy only; labels remain the accessible name of each control. */
export function inputPlaceholder(type = "text", label?: string): string | undefined {
  if ([
    "hidden", "file", "checkbox", "radio", "range", "color",
    "button", "submit", "reset", "image",
  ].includes(type)) return undefined;

  const name = label
    ?.replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s*\((?:optional|required)\)\s*/gi, " ")
    .trim()
    .replace(/[*:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const subject = name && !/\?$/.test(name)
    ? name.replace(/^[A-Z](?=[a-z])/, (letter) => letter.toLowerCase())
    : undefined;
  if (type === "search") return subject ? `Search ${subject}…` : "Search…";
  if (type === "date") return "YYYY-MM-DD";
  if (type === "datetime-local") return "YYYY-MM-DD HH:MM";
  if (type === "month") return "YYYY-MM";
  if (type === "week") return "YYYY-Www";
  if (type === "time") return "HH:MM";
  if (subject) return `Enter ${subject}`;
  return ({
    email: "Enter your email address",
    tel: "Enter a phone number",
    url: "Enter a website URL",
    password: "Enter your password",
    number: "Enter a number",
    textarea: "Enter your response",
  } as Record<string, string>)[type] ?? "Enter your answer";
}
