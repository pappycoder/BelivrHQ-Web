import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FIELD_TYPES, type FormField } from "@/hooks/use-forms";
import { Label } from "@/components/ui/label";
import { FormFieldsRenderer } from "./form-fields-renderer";

function render(field: FormField, validateRequired = false) {
  return renderToStaticMarkup(createElement(FormFieldsRenderer, { fields: [field], onChange: () => {}, showOptional: true, validateRequired }));
}

describe("respondent field required markers", () => {
  it.each(FIELD_TYPES)("renders one decorative marker for a required %s field", type => {
    const html = render({ key: "answer", label: "Your answer", type, required: true, options: ["First", "Second"] });
    expect(html.match(/data-required-indicator/g)).toHaveLength(1);
    expect(html).toMatch(/data-required-indicator[^>]*aria-hidden="true"/);
    expect(html).toContain(type === "checkbox" ? 'data-required="true"' : 'aria-required="true"');
  });
  it("leaves optional fields unmarked", () => {
    const html = render({ key: "answer", label: "Your answer", type: "text", required: false });
    expect(html).not.toContain("data-required-indicator");
    expect(html).toContain("(optional)");
  });
  it("preserves invalid feedback for an unanswered required field", () => {
    const html = render({ key: "answer", label: "Your answer", type: "text", required: true }, true);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-required="true"');
    expect(html.match(/data-required-indicator/g)).toHaveLength(1);
  });
});

it.each([
  "Your answer *",
  "Your answer ** ",
  ["Your answer", " *"],
  ["Your answer", false, " *"],
].map(children => ({ children })))("normalizes legacy label markers without adding another asterisk: %j", ({ children }) => {
  const html = renderToStaticMarkup(createElement(Label, { required: true }, children));
  expect(html.match(/data-required-indicator/g)).toHaveLength(1);
  expect(html.replace(/<[^>]*>/g, "")).not.toContain("*");
});
