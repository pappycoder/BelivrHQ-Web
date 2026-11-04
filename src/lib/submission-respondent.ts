import type { FormField } from "@/hooks/use-forms";

const normalize = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Answer-derived labels are self-reported, not verified account identities. */
export function submissionRespondent(
  submission: { id: string; data: Record<string, unknown> },
  fields: FormField[] = [],
) {
  const entries = Object.entries(submission.data ?? {}).flatMap(([key, value]) => {
    if (typeof value !== "string" || !value.trim()) return [];
    const field = fields.find((item) => item.key === key);
    return [{ key: normalize(key), label: normalize(field?.label ?? ""), type: field?.type, value: value.trim() }];
  });
  const answer = (names: string[]) => entries.find((entry) => names.includes(entry.key) || names.includes(entry.label))?.value;
  const fullName = answer(["full name", "your full name", "respondent name", "applicant name", "requester name", "your name", "name"]);
  const firstName = answer(["first name", "firstname", "given name"]);
  const lastName = answer(["last name", "lastname", "surname", "family name"]);
  const name = fullName || [firstName, lastName].filter(Boolean).join(" ");
  const email = answer(["email", "email address", "your email", "your email address"]) || entries.find((entry) => entry.type === "email")?.value;
  const phone = answer(["phone", "phone number", "mobile", "mobile number", "telephone"]) || entries.find((entry) => entry.type === "phone")?.value;
  const reference = `Response #${submission.id.slice(0, 8)}`;
  const primary = name || email || phone || reference;
  const contact = [email, phone].filter((value) => value && value !== primary).join(" · ");
  return { name: primary, contact, reference };
}
