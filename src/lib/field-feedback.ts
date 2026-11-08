/** Semantic, decorative icons; field values are never used to choose an icon. */
export const FIELD_ICON_PATHS = {
  user: '<path d="M20 21v-2a7 7 0 0 0-14 0v2"/><circle cx="13" cy="7" r="4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/><path d="M12 14v3"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  location:
    '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  church: '<path d="M12 2v6m-3-3h6M3 21v-9l9-5 9 5v9ZM9 21v-6h6v6"/>',
  building:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1"/>',
  search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  number: '<path d="M5 9h15M4 15h15M11 3 7 21M17 3l-4 18"/>',
  money:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  link: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 2 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
  message:
    '<path d="M21 15a3 3 0 0 1-3 3H7l-5 4V5a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3Z"/><path d="M7 7h10M7 12h7"/>',
  tag: '<path d="M20 13 11 22 2 13V3h10l8 8a2 2 0 0 1 0 2Z"/><circle cx="7" cy="8" r="1"/>',
  text: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/>',
} as const;
export type FieldIcon = keyof typeof FIELD_ICON_PATHS;

export function resolveFieldIcon(type: string, label: string): FieldIcon {
  const typeIcon: Partial<Record<string, FieldIcon>> = {
    password: "lock",
    email: "mail",
    tel: "phone",
    search: "search",
    url: "link",
    time: "clock",
    date: "calendar",
    "datetime-local": "calendar",
    month: "calendar",
    week: "calendar",
  };
  if (typeIcon[type]) return typeIcon[type]!;
  const words = label.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  if (
    type === "password" ||
    /password|secret|credential|api.?key|access.?token/.test(words)
  )
    return "lock";
  if (type === "email" || /e.?mail/.test(words)) return "mail";
  if (type === "tel" || /phone|mobile|whats.?app|telephone/.test(words))
    return "phone";
  if (type === "search" || /search|find |filter/.test(words)) return "search";
  if (type === "url" || /website|url|\blink\b/.test(words)) return "link";
  if (type === "time" || /\btime\b|duration/.test(words)) return "clock";
  if (
    ["date", "datetime-local", "month", "week"].includes(type) ||
    /\bdate\b|birth|birthday/.test(words)
  )
    return "calendar";
  if (
    /amount|price|cost|budget|salary|offering|donation|balance|income/.test(
      words,
    )
  )
    return "money";
  if (/address|city|state|country|postal|zip|location/.test(words))
    return "location";
  if (/church|denomination/.test(words)) return "church";
  if (/branch|company|organisation|organization|venue/.test(words))
    return "building";
  if (
    /first.?name|last.?name|full.?name|given.?name|family.?name|surname|person|member|visitor|contact.?name|username|gender|\bname\b/.test(
      words,
    )
  )
    return "user";
  if (
    /note|description|message|comment|reason|prayer|content|body/.test(words) ||
    type === "textarea"
  )
    return "message";
  if (
    type === "number" ||
    /count|quantity|number|code|capacity|total|\bage\b/.test(words)
  )
    return "number";
  if (/title|category|label|subject/.test(words)) return "tag";
  return "text";
}

export function fieldIconImage(icon: FieldIcon, color: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${FIELD_ICON_PATHS[icon]}</svg>`)}")`;
}

/** A single contiguous edit; code points keep emoji surrogate pairs intact. */
export function fieldTextEdit(before: string, after: string) {
  const old = Array.from(before),
    next = Array.from(after);
  let start = 0,
    end = 0;
  while (
    start < old.length &&
    start < next.length &&
    old[start] === next[start]
  )
    start++;
  while (
    end < old.length - start &&
    end < next.length - start &&
    old[old.length - 1 - end] === next[next.length - 1 - end]
  )
    end++;
  return {
    prefix: next.slice(0, start).join(""),
    inserted: next.slice(start, next.length - end).join(""),
    removed: old.slice(start, old.length - end).join(""),
    suffix: end ? next.slice(next.length - end).join("") : "",
  };
}
