import { describe, expect, it } from "vitest";
import { submissionRespondent } from "./submission-respondent";

const identify = (data: Record<string, unknown>) => submissionRespondent({ id: "abc12345-rest", data });

describe("submission respondent labels", () => {
  it("uses the provided name and retains contact details", () => {
    expect(identify({ full_name: " Grace Adeyemi ", email: "grace@example.test", phone: "08012345678" })).toEqual({
      name: "Grace Adeyemi", contact: "grace@example.test · 08012345678", reference: "Response #abc12345",
    });
  });
  it("combines split names, including camel case keys", () => {
    expect(identify({ firstName: "Grace", last_name: "Adeyemi" }).name).toBe("Grace Adeyemi");
  });
  it("recognizes custom keys through their field labels", () => {
    expect(submissionRespondent({ id: "one", data: { question_1: "Grace" } }, [
      { key: "question_1", label: "Your full name", type: "text" },
    ]).name).toBe("Grace");
  });
  it("falls back to email then phone without treating unrelated names as people", () => {
    expect(identify({ team_name: "Welcome", email: "grace@example.test" }).name).toBe("grace@example.test");
    expect(identify({ phone_number: "08012345678" }).name).toBe("08012345678");
  });
  it("uses a distinct response reference for empty or non-text answers", () => {
    expect(identify({ name: ["Music"], email: "  ", quantity: 2 }).name).toBe("Response #abc12345");
    expect(submissionRespondent({ id: "def67890-rest", data: {} }).name).toBe("Response #def67890");
  });
});
