import { RECORD_FIELD_CATALOG } from "./record-field-catalog";

export interface RecordFieldColumn {
  id: string;
  label: string;
  path: string[];
  defaultHidden: true;
  hideable: true;
}
const sensitive =
  /^(password|passwordHash|accessToken|refreshToken|secret|secretKey|apiKey|jwt|authorization|encryptedCredentials)$/i;
export function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    id: "Record ID",
    memberId: "Member ID",
    profileId: "Staff ID",
    churchId: "Church ID",
    branchId: "Branch ID",
    whatsappNumber: "WhatsApp",
    dateOfBirth: "Date of birth",
    createdAt: "Created",
    updatedAt: "Last updated",
    archivedAt: "Archived",
    photoUrl: "Photo URL",
    isActive: "Active",
  };
  return (
    labels[key] ??
    key
      .replace(/([a-z\d])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (char) => char.toUpperCase())
  );
}
export function inferRecordType(tableId: string) {
  const rules: [RegExp, string][] = [
    [/pending/, "pending"],
    [/members/, "member"],
    [/visitors/, "visitor"],
    [/families/, "family"],
    [/team/, "profile"],
    [/locations/, "branch"],
    [/groups/, "department"],
    [/forms-submissions|submissions-/, "formSubmission"],
    [/forms/, "form"],
    [/broadcasts/, "broadcast"],
    [/sermons/, "sermon"],
    [/events-registrations/, "eventRegistration"],
    [/tickets/, "eventTicket"],
    [/giving-schedules/, "recurringGiving"],
    [/assets/, "asset"],
    [/attendance/, "attendance"],
    [/billing/, "subscriptionPayment"],
  ];
  return rules.find(([rule]) => rule.test(tableId))?.[1];
}
export function recordFieldColumns(
  records: readonly object[],
  options: {
    recordType?: string;
    fields?: readonly { key: string; label: string }[];
    labels?: Record<string, string>;
    existingLabels?: string[];
  } = {},
): RecordFieldColumn[] {
  const paths = new Map<string, string[]>();
  function add(path: string[]) {
    if (!path.some((key) => sensitive.test(key)))
      paths.set(JSON.stringify(path), path);
  }
  for (const key of RECORD_FIELD_CATALOG[options.recordType ?? ""] ?? [])
    add([key]);
  for (const field of options.fields ?? []) add(["data", field.key]);
  function visit(record: object, prefix: string[] = [], depth = 0) {
    for (const [key, value] of Object.entries(record)) {
      const path = [...prefix, key];
      if (sensitive.test(key) || key.startsWith("__")) continue;
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        depth < 2
      )
        visit(value, path, depth + 1);
      else add(path);
    }
  }
  records.forEach((record) => visit(record));
  const normalized = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const current = new Set((options.existingLabels ?? []).map(normalized));
  return [...paths.values()].flatMap((path) => {
    const known =
      path[0] === "data"
        ? options.fields?.find((field) => field.key === path[1])?.label
        : undefined;
    let label =
      options.labels?.[path.join(".")] ??
      known ??
      path
        .filter((key) => !["data", "customFields"].includes(key))
        .map(fieldLabel)
        .join(" · ");
    if (current.has(normalized(label))) {
      if (path[0] === "customFields") label += " (custom)";
      else if (path[0] === "data" && path.length > 1) label += " (answer)";
      else return [];
    }
    return [
      {
        id: `field:${JSON.stringify(path)}`,
        label,
        path,
        defaultHidden: true as const,
        hideable: true as const,
      },
    ];
  });
}
export function recordFieldValue(
  record: object | undefined,
  path: string[],
): unknown {
  return path.reduce<unknown>(
    (value, key) =>
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[key]
        : undefined,
    record,
  );
}
export function recordFieldText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(recordFieldText).join(", ") || "—";
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    if (row.name || row.firstName)
      return String(
        row.name ?? `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
      );
    return Object.entries(row)
      .filter(([key]) => !sensitive.test(key))
      .map(([key, item]) => `${fieldLabel(key)}: ${recordFieldText(item)}`)
      .join(" · ");
  }
  return String(value);
}
export function recordLookup(records: readonly object[], key?: string) {
  return new Map(
    records.map((record) => {
      const row = record as Record<string, unknown>;
      const id = key
        ? row[key]
        : (row.id ??
          row.memberId ??
          row.profileId ??
          row.familyId ??
          row.branchId ??
          row.name);
      return [String(id), record] as const;
    }),
  );
}

/** React prefixes keys when it flattens nested row arrays. Data IDs stay unchanged. */
export function tableRecordKey(key: string) {
  return key
    .replace(/^\.(?:\d+:)*\$/, "")
    .replace(/=0/g, "=")
    .replace(/=2/g, ":");
}
