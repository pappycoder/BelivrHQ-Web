import { describe, expect, it } from "vitest";
import { isRecordDetailHref, isRecordOpenLabel } from "./record-row-navigation";

describe("record row destinations", () => {
  it("recognizes detail actions without treating mutations or edits as opens", () => {
    for (const label of [
      "Open department",
      "View",
      "Inspect response",
      "Review registration",
      "Details",
    ])
      expect(isRecordOpenLabel(label)).toBe(true);
    for (const label of [
      "Approve",
      "Delete record",
      "Archive",
      "Edit member",
      "Previewing",
      "Publish",
    ])
      expect(isRecordOpenLabel(label)).toBe(false);
  });
  it("accepts internal record links and query-based detail views", () => {
    const current = "https://church.test/people/members";
    expect(isRecordDetailHref("/people/members/member-a", current)).toBe(true);
    expect(isRecordDetailHref("?record=member-a", current)).toBe(true);
  });
  it("rejects edit/create/mutation/download routes and external or script URLs", () => {
    const current = "https://church.test/people/members";
    for (const href of [
      "#section",
      "",
      current,
      "/people/members/new",
      "/people/members/a/edit",
      "/people/members/a/archive",
      "/downloads/export",
      "https://other.test/member/a",
      "javascript:alert(1)",
      "mailto:test@example.test",
    ])
      expect(isRecordDetailHref(href, current)).toBe(false);
  });
});
