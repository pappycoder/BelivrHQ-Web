import { describe, expect, it } from "vitest";
import {
  fieldIconImage,
  fieldTextEdit,
  resolveFieldIcon,
} from "./field-feedback";

describe("field semantics", () => {
  it.each([
    ["text", "firstName", "user"],
    ["text", "Last name", "user"],
    ["text", "Name", "user"],
    ["email", "Church email", "mail"],
    ["text", "WhatsApp number", "phone"],
    ["password", "Password", "lock"],
    ["text", "API key", "lock"],
    ["date", "First visit date", "calendar"],
    ["text", "Date of birth", "calendar"],
    ["text", "Church name", "church"],
    ["text", "Branch name", "building"],
    ["text", "Street address", "location"],
    ["text", "State", "location"],
    ["number", "Donation amount", "money"],
    ["number", "Attendee count", "number"],
    ["url", "Sermon link", "link"],
    ["search", "Find a person", "search"],
    ["textarea", "Prayer request", "message"],
    ["time", "Starts at", "clock"],
    ["text", "Page title", "tag"],
    ["text", "Updated title", "tag"],
    ["search", "Search by email", "search"],
    ["select", "Gender", "user"],
  ])("%s / %s gets a %s prefix", (type, label, icon) =>
    expect(resolveFieldIcon(type, label)).toBe(icon),
  );
  it("uses a neutral prefix for unknown custom fields and creates decorative SVG data only", () => {
    expect(resolveFieldIcon("text", "Custom response")).toBe("text");
    expect(fieldIconImage("phone", "#64748b")).toContain("data:image/svg+xml");
  });
});
describe("editable text differences", () => {
  it("isolates insertion in the middle without replacing the suffix", () => {
    expect(fieldTextEdit("Grace", "Grxace")).toEqual({
      prefix: "Gr",
      inserted: "x",
      removed: "",
      suffix: "ace",
    });
  });
  it("isolates backward and forward deletion", () => {
    expect(fieldTextEdit("Grace", "Grac")).toEqual({
      prefix: "Grac",
      inserted: "",
      removed: "e",
      suffix: "",
    });
    expect(fieldTextEdit("Grace", "Gace")).toEqual({
      prefix: "G",
      inserted: "",
      removed: "r",
      suffix: "ace",
    });
  });
  it("keeps emoji intact, supports replacement and handles an emptied field", () => {
    expect(fieldTextEdit("A🙂B", "AB")).toEqual({
      prefix: "A",
      inserted: "",
      removed: "🙂",
      suffix: "B",
    });
    expect(fieldTextEdit("🙂", "🙌")).toEqual({
      prefix: "",
      inserted: "🙌",
      removed: "🙂",
      suffix: "",
    });
    expect(fieldTextEdit("A", "")).toEqual({
      prefix: "",
      inserted: "",
      removed: "A",
      suffix: "",
    });
    expect(fieldTextEdit("same", "same")).toEqual({
      prefix: "same",
      inserted: "",
      removed: "",
      suffix: "",
    });
  });
});
