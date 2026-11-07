import { describe, expect, it } from "vitest";
import { isPublicContentPath } from "./public-content-path";

describe("public content navigation boundary", () => {
  it.each(["/privacy-policy", "/privacy-policy/", "/terms-of-service", "/terms-and-conditions/", "/accept-invitation", "/accept-invitation/", "/help", "/help/contact-support", "/forms/public/token-a", "/forms/public/token-a/", "/register/public/token-a", "/register/public/token-a/"])(
    "keeps %s public during session restoration",
    (path) => {
      expect(isPublicContentPath(path)).toBe(true);
    },
  );
  it.each([
    "/privacy-policy/admin",
    "/terms-of-service/other",
    "/terms-and-conditions-extra",
    "/accept-invitation/other",
    "/forms",
    "/forms/form-a",
    "/forms/form-a/fill",
    "/forms/public",
    "/forms/publicity/token-a",
    "/forms/public/token-a/edit",
    "/admin/users",
  ])("does not exempt %s from authentication", (path) => {
    expect(isPublicContentPath(path)).toBe(false);
  });
});
