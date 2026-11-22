import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RecordQueryError } from "@/components/shared/record-query-error";
import { isMissingRecordError, recordErrorStatus } from "./record-query-error";

vi.mock("@/components/tours/navigation-page-tour", () => ({ NavigationPageTour: () => null }));

describe("record failure classification", () => {
  it("reserves missing-record guidance for an explicit HTTP 404", () => {
    expect(isMissingRecordError({ statusCode: 404 })).toBe(true);
    for (const error of [null, undefined, new Error("Network unavailable"), { statusCode: 401 }, { statusCode: 403 }, { statusCode: 503 }, { statusCode: "404" }]) {
      expect(isMissingRecordError(error)).toBe(false);
    }
    expect(recordErrorStatus(new Error("Network unavailable"))).toBeUndefined();
  });

  it.each([503, 401, undefined])("offers recovery and navigation for status %s without exposing server details", (statusCode) => {
    const html = renderToStaticMarkup(createElement(RecordQueryError, {
      title: "Member details", error: { statusCode, message: "private server diagnostics" },
      backHref: "/people/members", backLabel: "Back to members",
    }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Unable to load member details");
    expect(html).toContain("Try again");
    expect(html).toContain('href="/people/members"');
    expect(html).not.toContain("private server diagnostics");
    expect(html).not.toContain("deleted");
    expect(html).not.toContain('data-slot="skeleton"');
  });

  it("explains an explicit access denial instead of suggesting the record was deleted", () => {
    const html = renderToStaticMarkup(createElement(RecordQueryError, {
      title: "Member details", error: { statusCode: 403 },
      backHref: "/people/members", backLabel: "Back to members",
    }));
    expect(html).toContain("Access denied");
    expect(html).toContain("Contact your church administrator");
    expect(html).not.toContain("deleted");
  });
});
