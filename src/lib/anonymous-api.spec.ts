import { describe, expect, it } from "vitest";
import { isAnonymousPublicFormRequest } from "./anonymous-api";

describe("anonymous public form boundary", () => {
  it.each([
    ["forms/public/token-a/meta", "GET"],
    ["intake/public/token-a/meta", "GET"],
    ["intake/public/token-a/submit", "POST"],
    ["forms/public/token-a/submit", "POST"],
  ])("allows the token-scoped public operation %s %s", (path, method) => {
    expect(isAnonymousPublicFormRequest(path, method)).toBe(true);
  });
  it.each([
    ["forms/private-form", "GET"],
    ["intake/submissions", "GET"],
    ["intake/public/token-a/submit", "DELETE"],
    ["intake/public/token-a/meta/extra", "GET"],
    ["forms/public/token-a/submissions", "GET"],
    ["forms/public/token-a/submit", "PATCH"],
    ["forms/public/token-a/submit", "GET"],
    ["forms/public/token-a/meta", "POST"],
    ["forms/public/token-a/meta/extra", "GET"],
    ["forms/public/../meta", "GET"],
    ["forms/public/token-a/submit", "DELETE"],
  ])("retains authentication for %s %s", (path, method) => {
    expect(isAnonymousPublicFormRequest(path, method)).toBe(false);
  });
});
