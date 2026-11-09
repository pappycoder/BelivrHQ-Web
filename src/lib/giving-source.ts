import type { GivingTransaction } from "@/hooks/use-giving";

type SourceRecord = Pick<
  GivingTransaction,
  | "givingType"
  | "memberId"
  | "memberName"
  | "title"
  | "cellGroupId"
  | "cellGroupName"
  | "serviceId"
  | "serviceName"
  | "eventId"
  | "eventName"
>;
const clean = (value?: string) => value?.trim() || undefined;

/** A missing individual giver is a collection source, not an anonymity flag. */
export function givingSource(record: SourceRecord) {
  const member = clean(record.memberName);
  const group = clean(record.cellGroupName);
  const title = clean(record.title);
  const service = clean(record.serviceName);
  const event = clean(record.eventName);
  const context = [...new Set([service, event, group].filter(Boolean))].join(
    " · ",
  );
  if (record.givingType === "cell_group" || record.cellGroupId || group)
    return {
      kind: "cell_group" as const,
      label: group || title || "Cell group giving",
      typeLabel: "Cell group giving",
      context,
    };
  if (member || record.memberId)
    return {
      kind: "member" as const,
      label: member || "Member giving",
      typeLabel: "Individual giving",
      context,
    };
  return {
    kind: "general" as const,
    label: title || "General giving",
    typeLabel:
      service || record.serviceId
        ? "Service collection"
        : event || record.eventId
          ? "Event collection"
          : "General collection",
    context,
  };
}
