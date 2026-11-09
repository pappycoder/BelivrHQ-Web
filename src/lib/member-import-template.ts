import type { ExcelSheet } from "./excel-design";

/** Target fields the importer can fill on each member record. */
export const TARGET_FIELDS: Array<{
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}> = [
  { key: "firstName", label: "First Name *", required: true, aliases: ["firstname", "first", "givenname", "forename"] },
  { key: "lastName", label: "Last Name *", required: true, aliases: ["lastname", "last", "surname", "familyname"] },
  { key: "email", label: "Email", aliases: ["email", "emailaddress"] },
  { key: "phone", label: "Phone", aliases: ["phone", "phonenumber", "mobile", "telephone", "tel"] },
  { key: "whatsappNumber", label: "WhatsApp Number", aliases: ["whatsapp", "whatsappnumber", "whatsappno"] },
  { key: "gender", label: "Gender", aliases: ["gender", "sex"] },
  { key: "dateOfBirth", label: "Date of Birth", aliases: ["dateofbirth", "dob", "birthday"] },
  { key: "address", label: "Address", aliases: ["address", "streetaddress", "residentialaddress"] },
  { key: "city", label: "City", aliases: ["city", "town"] },
  { key: "state", label: "State", aliases: ["state", "region", "province"] },
  { key: "branch", label: "Branch (by name)", aliases: ["branch", "branchname", "campus"] },
  { key: "notes", label: "Notes", aliases: ["notes", "note", "comments"] },
];

export function memberImportTemplate(branchNames: string[], branchName?: string): ExcelSheet[] {
  const example = ["Chioma", "Eze", "chioma@example.com", "+234 803 456 7890", "", "female", new Date("1995-04-12T00:00:00Z"), "12 Awolowo Road", "Lagos", "Lagos", branchName ?? branchNames[0] ?? "", ""];
  return [
    { name: "Members", template: true, columns: TARGET_FIELDS.map((field) => ({
      key: field.key, label: field.label.replace(/ \*$/, "").replace(/ \(.*\)$/, ""),
      ...(["phone", "whatsappNumber"].includes(field.key) ? { numberFormat: "@" } : {}),
      ...(field.key === "dateOfBirth" ? { dateInput: true, numberFormat: "yyyy-mm-dd", width: 24 } : {}),
      ...(field.key === "gender" ? { options: ["male", "female"] } : {}),
      ...(field.key === "branch" ? { options: branchNames } : {}),
    })), data: [Object.fromEntries(TARGET_FIELDS.map((field, index) => [field.key, example[index]]))] },
    { name: "Instructions", columns: [{ key: "step", label: "Step", width: 22 }, { key: "instruction", label: "Instructions", width: 80 }], data: [
      { step: "1. Add members", instruction: "Replace the example on the Members sheet. First Name and Last Name are required. Keep the headers in row 1 unchanged." },
      { step: "2. Choose values", instruction: "Use the Gender and Branch dropdowns. Dropdowns are prepared through row 500; copy a formatted row to extend them." },
      { step: "3. Dates", instruction: "Date of Birth cells are formatted as dates. Use your spreadsheet app's calendar if available, or type YYYY-MM-DD (for example, 1995-04-12). LibreOffice Calc may require typed dates; date validation alone does not add a calendar popup." },
      { step: "4. Phone numbers", instruction: "Phone and WhatsApp columns are preformatted as Text, preserving + country codes and leading zeros. Enter +234 803 456 7890 or 08034567890 directly. When pasting, keep the destination formatting. In an older template, set these columns to Text before entering numbers." },
      { step: "5. Upload", instruction: "Save as .xlsx and upload it on Import Members. Review the preview before confirming. Workbook edits do not update BelivrHQ until imported." },
    ] },
  ];
}
