import { describe, expect, it } from "vitest";
import {
  recordFieldColumns,
  recordFieldValue,
  recordFieldText,
  recordLookup,
  tableRecordKey,
} from "./record-fields";

describe("complete record columns", () => {
  it("offers optional schema fields even if no visible record has a value, without changing defaults", () => {
    const columns = recordFieldColumns(
      [{ memberId: "m", firstName: "Grace" }],
      { recordType: "member", existingLabels: ["Status"] },
    );
    expect(
      columns.find((column) => column.label === "Date of birth"),
    ).toMatchObject({
      defaultHidden: true,
      hideable: true,
      path: ["dateOfBirth"],
    });
    expect(columns.some((column) => column.label === "WhatsApp")).toBe(true);
    expect(columns.some((column) => column.label === "Status")).toBe(false);
  });
  it("offers each custom answer using its configured label and handles literal dots in keys", () => {
    const row = {
      id: "r",
      data: { "custom:region": "North" },
      customFields: { "Emergency.contact": "Ada" },
    };
    const fields = recordFieldColumns([row], {
      fields: [{ key: "custom:region", label: "Region" }],
    });
    expect(fields.find((field) => field.label === "Region")?.path).toEqual([
      "data",
      "custom:region",
    ]);
    expect(recordFieldValue(row, ["customFields", "Emergency.contact"])).toBe(
      "Ada",
    );
  });
  it("does not offer technical credential columns or internal row markers", () => {
    const columns = recordFieldColumns([
      {
        id: "r",
        accessToken: "private",
        passwordHash: "private",
        customFields: { Ministry: "Choir" },
        __rowKey: "r",
      },
    ]);
    expect(columns.map((column) => column.label).join(" ")).not.toMatch(
      /token|password|row key/i,
    );
    expect(columns.some((column) => column.label === "Ministry")).toBe(true);
  });
  it("retains custom answers with labels that match an existing register column", () => {
    const columns = recordFieldColumns(
      [{ customFields: { Status: "Choir" }, data: { Status: "Available" } }],
      { existingLabels: ["Status"] },
    );
    expect(columns.map((column) => column.label)).toEqual([
      "Status (custom)",
      "Status (answer)",
    ]);
  });
  it("keeps values readable and resolves record IDs without coercing business values", () => {
    const row = { memberId: "m", phone: "+234001", active: false };
    expect(recordLookup([row], "memberId").get("m")).toBe(row);
    expect(recordFieldText(row.phone)).toBe("+234001");
    expect(recordFieldText(false)).toBe("No");
    expect(recordFieldText([{ firstName: "Grace", lastName: "Adeyemi" }])).toBe(
      "Grace Adeyemi",
    );
    expect(recordFieldText(null)).toBe("—");
  });
  it.each([
    [".$a", "a"],
    [".1:$a=2b", "a:b"],
    [".0:1:$a=0b", "a=b"],
    ["plain-id", "plain-id"],
  ])("resolves React row key %s", (key, expected) =>
    expect(tableRecordKey(key)).toBe(expected),
  );
});
