import {
  test,
  expect,
  type BrowserContext,
  type Locator,
} from "@playwright/test";
import { mockBotChallenges, verifyBotForm } from "../fixtures/bot-protection";
const fields = [
  {
    key: "gender",
    label: "Gender",
    type: "dropdown",
    options: ["male", "female"],
  },
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "amount", label: "Offering amount", type: "number" },
  { key: "website", label: "Website", type: "text" },
  { key: "notes", label: "Notes", type: "textarea", required: true },
];
async function fixture(context: BrowserContext) {
  await context.route("https://embed.tawk.to/**", (r) =>
    r.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (r) =>
    r.fulfill({ json: { hasSession: false } }),
  );
  await context.route("**/api/backend/**", (r) =>
    r.fulfill({ json: { success: true, data: {} } }),
  );
  await context.route("**/api/backend/forms/public/feedback/meta", (r) =>
    r.fulfill({
      json: {
        success: true,
        data: {
          title: "Registration feedback",
          churchName: "Grace Church",
          fields,
        },
      },
    }),
  );
  await mockBotChallenges(context);
}
async function armEditSample(field: Locator) {
  await field.evaluate((el) => {
    const capture = (event: Event) => {
      if (event.target !== el) return;
      document.removeEventListener("input", capture, true);
      const layer = document.querySelector("[data-field-motion]");
      const moving = layer?.querySelector(
        "[data-field-enter],[data-field-exit]",
      );
      const sample = {
        value: (el as HTMLInputElement).value,
        mode: layer?.getAttribute("data-field-motion"),
        text: moving?.textContent,
        frames:
          moving?.getAnimations()[0]?.effect instanceof KeyframeEffect
            ? (moving.getAnimations()[0].effect as KeyframeEffect)
                .getKeyframes()
                .map((f) => ({ top: f.top, opacity: f.opacity }))
            : [],
        caret: getComputedStyle(el).caretColor,
        layerHidden: layer?.getAttribute("aria-hidden"),
        mirrorText: layer?.textContent,
        whiteSpace: layer?.firstElementChild?.firstElementChild
          ? getComputedStyle(layer.firstElementChild.firstElementChild)
              .whiteSpace
          : undefined,
        afterMicrotask: false,
      };
      (el as HTMLElement & { editSample: typeof sample }).editSample = sample;
      queueMicrotask(() => {
        sample.afterMicrotask = !!layer?.isConnected;
      });
    };
    document.addEventListener("input", capture, true);
  });
}
async function armErrorSample(field: Locator) {
  await field.evaluate((el) => {
    const observer = new MutationObserver(() => {
      if (el.getAttribute("aria-invalid") !== "true") return;
      (el as HTMLElement & { sawErrorShake?: boolean }).sawErrorShake = el
        .getAnimations()
        .some((a) => a.id === "field-error-shake");
      observer.disconnect();
    });
    observer.observe(el, {
      attributes: true,
      attributeFilter: ["aria-invalid"],
    });
  });
}
async function editingState(field: Locator) {
  return field.evaluate(
    (el) =>
      (
        el as HTMLElement & {
          editSample?: {
            value: string;
            mode?: string;
            text?: string;
            mirrorText?: string;
            whiteSpace?: string;
            caret: string;
            afterMicrotask: boolean;
          };
        }
      ).editSample,
  );
}
test.beforeEach(async ({ context }) => fixture(context));

test("generated fields receive semantic prefixes without losing their native controls", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  for (const [label, icon] of [
    ["First name", "user"],
    ["Gender", "user"],
    ["Email", "mail"],
    ["Phone", "phone"],
    ["Date of birth", "calendar"],
    ["Offering amount", "money"],
    ["Website", "link"],
    ["Notes", "message"],
  ]) {
    const field = page
      .getByLabel(label, { exact: false })
      .and(page.locator("[data-field-label],[data-slot=select-trigger]"));
    await expect(field).toHaveAttribute("data-field-icon", icon);
    expect(
      await field.evaluate((el) => getComputedStyle(el).backgroundImage),
    ).toContain("data:image/svg+xml");
  }
  await expect(page.getByLabel("Date of birth")).toHaveAttribute(
    "type",
    "date",
  );
  await expect(page.getByLabel("Offering amount")).toHaveAttribute(
    "type",
    "number",
  );
});

test("typing slides up and fades in; deleting slides down and fades out", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  const field = page.getByLabel("First name", { exact: false });
  await field.click();
  await armEditSample(field);
  await field.press("G");
  const entered = await editingState(field);
  expect(entered).toMatchObject({
    value: "G",
    mode: "insert",
    text: "G",
    layerHidden: "true",
    frames: [
      { top: "4px", opacity: "0" },
      { top: "0px", opacity: "1" },
    ],
  });
  expect(entered?.afterMicrotask).toBe(true);
  expect(entered?.caret).not.toBe("rgba(0, 0, 0, 0)");
  await armEditSample(field);
  await field.press("Backspace");
  expect(await editingState(field)).toMatchObject({
    value: "",
    mode: "delete",
    text: "G",
    frames: [
      { top: "0px", opacity: "0.8" },
      { top: "4px", opacity: "0" },
    ],
  });
  await expect(field).not.toHaveAttribute("data-field-animating", "true");
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
});

test("middle edits and selection retain the native caret and selected text", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  const field = page.getByLabel("First name", { exact: false });
  await field.fill("Grace");
  await field.press("Home");
  await field.press("ArrowRight");
  await field.press("ArrowRight");
  await armEditSample(field);
  await field.press("x");
  expect((await editingState(field))?.value).toBe("Grxace");
  expect(
    await field.evaluate((el) => (el as HTMLInputElement).selectionStart),
  ).toBe(3);
  await field.press("ControlOrMeta+a");
  await expect(field).not.toHaveAttribute("data-field-animating", "true");
  await field.press("Z");
  await expect(field).toHaveValue("Z");
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
});

test("multiline editing, scrolling and blur restore visible native text", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  const field = page.getByLabel("Notes", { exact: false });
  await field.fill("Line one\nLine two");
  await field.press("End");
  await armEditSample(field);
  await field.press("x");
  expect(await editingState(field)).toMatchObject({
    value: "Line one\nLine twox",
    mode: "insert",
    text: "x",
  });
  expect((await editingState(field))?.whiteSpace).toBe("pre-wrap");
  await field.press("Tab");
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
  await expect(field).not.toHaveAttribute("data-field-animating", "true");
});

test("generated required-field errors turn borders red, shake, and clear when corrected", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  const name = page.getByLabel("First name", { exact: false });
  await armErrorSample(name);
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Send response", exact: true })
    .click();
  const notes = page.getByLabel("Notes", { exact: false });
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(notes).toHaveAttribute("aria-invalid", "true");
  const states = await name.evaluate((el) => ({
    border: getComputedStyle(el).borderColor,
    shaking: (el as HTMLElement & { sawErrorShake?: boolean }).sawErrorShake,
  }));
  expect(states.shaking).toBe(true);
  const color = await name.evaluate((el) => {
    const swatch = document.createElement("span");
    swatch.style.color = "var(--destructive)";
    el.parentElement!.append(swatch);
    const color = getComputedStyle(swatch).color;
    swatch.remove();
    return color;
  });
  await expect
    .poll(() => name.evaluate((el) => getComputedStyle(el).borderColor))
    .toBe(color);
  await name.fill("Grace");
  await notes.fill("A note");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  await expect(notes).not.toHaveAttribute("aria-invalid", "true");
});

test("native invalid fields shake again on retry without showing errors on first load", async ({
  page,
}) => {
  await page.goto("/login");
  const email = page.getByLabel("Email Address", { exact: true });
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("data-field-prefix", "existing");
  await email.evaluate((el) => (el as HTMLInputElement).reportValidity());
  await expect(email).toHaveAttribute("data-field-native-invalid", "true");
  expect(
    await email.evaluate((el) =>
      el.getAnimations().some((a) => a.id === "field-error-shake"),
    ),
  ).toBe(true);
  await page.waitForTimeout(350);
  await email.evaluate((el) => (el as HTMLInputElement).reportValidity());
  expect(
    await email.evaluate((el) =>
      el.getAnimations().some((a) => a.id === "field-error-shake"),
    ),
  ).toBe(true);
  await email.fill("grace@example.test");
  await expect(email).not.toHaveAttribute("data-field-native-invalid", "true");
});

test("password feedback never mirrors plaintext and keeps the reveal button usable", async ({
  page,
}) => {
  await page.goto("/login");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("data-field-icon", "lock");
  await password.click();
  await armEditSample(password);
  await password.press("s");
  expect(await editingState(password)).toMatchObject({
    value: "s",
    mode: "insert",
    text: "•",
  });
  expect((await editingState(password))?.mirrorText).not.toContain("s");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("s");
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
});

test("reduced motion preserves icons and red errors without text animation or shake", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  const email = page.getByLabel("Email Address", { exact: true });
  await email.click();
  await email.press("g");
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
  await email.evaluate((el) => (el as HTMLInputElement).reportValidity());
  await expect(email).toHaveAttribute("data-field-native-invalid", "true");
  expect(
    await email.evaluate((el) =>
      el.getAnimations().some((a) => a.id === "field-error-shake"),
    ),
  ).toBe(false);
  await expect(email).toHaveAttribute("data-field-icon", "mail");
});

test("composition and programmatic changes do not animate or interfere with the edited value", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  const field = page.getByLabel("First name", { exact: false });
  await field.evaluate((el) => {
    el.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    el.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "insertCompositionText",
        data: "教",
        bubbles: true,
      }),
    );
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, "教");
    el.dispatchEvent(
      new InputEvent("input", {
        inputType: "insertCompositionText",
        data: "教",
        isComposing: true,
        bubbles: true,
      }),
    );
    el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
  });
  await expect(field).toHaveValue("教");
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
  await field.evaluate((el) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, "Saved name");
    el.dispatchEvent(
      new InputEvent("input", {
        inputType: "insertReplacementText",
        bubbles: true,
      }),
    );
  });
  await expect(field).toHaveValue("Saved name");
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
});

test("raw controls added later get prefixes and native reset clears their feedback", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.id = "raw-form";
    const label = document.createElement("label");
    label.htmlFor = "raw-city";
    label.textContent = "City";
    const input = document.createElement("input");
    input.id = "raw-city";
    input.required = true;
    input.className = "border p-3";
    form.append(label, input);
    document.body.append(form);
  });
  const field = page.getByLabel("City", { exact: true });
  await expect(field).toHaveAttribute("data-field-icon", "location");
  await field.evaluate((el) => (el as HTMLInputElement).reportValidity());
  await expect(field).toHaveAttribute("data-field-native-invalid", "true");
  await page.evaluate(() =>
    (document.getElementById("raw-form") as HTMLFormElement).reset(),
  );
  await expect(field).not.toHaveAttribute("data-field-native-invalid", "true");
  await expect(field).not.toHaveAttribute("aria-invalid", "true");
});

test("a narrow mobile layout keeps prefix space, cursor editing and no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/forms/public/feedback");
  const field = page.getByLabel("First name", { exact: false });
  await field.fill("Grace");
  await field.press("End");
  await field.press("x");
  await expect(field).toHaveValue("Gracex");
  expect(
    await field.evaluate((el) =>
      parseFloat(getComputedStyle(el).paddingInlineStart),
    ),
  ).toBeGreaterThanOrEqual(32);
  await field.press("Tab");
  await page.screenshot({
    path: "/tmp/churchos-field-feedback-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("invalid numeric partial edits keep native rendering", async ({
  page,
}) => {
  await page.goto("/forms/public/feedback");
  const field = page.getByLabel("Offering amount", { exact: false });
  await field.click();
  await field.press("1");
  await field.press("e");
  expect(
    await field.evaluate((el) => (el as HTMLInputElement).validity.badInput),
  ).toBe(true);
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
});

test("password reset mismatch highlights confirmation and clears as passwords match", async ({
  page,
}) => {
  await page.goto("/reset-password?token=test-only");
  await page.getByLabel("New Password", { exact: true }).fill("LongPassword1!");
  const confirmation = page.getByLabel("Confirm Password", { exact: true });
  await confirmation.fill("DifferentPassword2!");
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(
    page.getByText("Passwords do not match.", { exact: true }),
  ).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await confirmation.fill("LongPassword1!");
  await expect(confirmation).not.toHaveAttribute("aria-invalid", "true");
});

test("generated fields have meaningful placeholders without changing their labels", async ({ page, context }) => {
  await fixture(context);
  await page.goto("/forms/public/feedback");
  await expect(page.getByLabel(/^First name/)).toHaveAttribute("placeholder", "Enter first name");
  await expect(page.getByLabel(/^Email/)).toHaveAttribute("placeholder", "Enter email");
  await expect(page.getByLabel(/^Offering amount/)).toHaveAttribute("placeholder", "Enter offering amount");
  await expect(page.getByLabel(/^Notes/)).toHaveAttribute("placeholder", "Enter notes");
  await expect(page.getByLabel(/^Date of birth/)).toHaveAttribute("type", "date");
  for (const field of await page.locator(':is(input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea):not([data-bot-protection] *, [aria-hidden="true"] *)').all()) {
    if (await field.isVisible()) await expect(field).toHaveAttribute("placeholder", /\S/);
  }
});

test("new raw fields receive label-based hints while authored copy and hidden fields are preserved", async ({ page, context }) => {
  await fixture(context);
  await page.goto("/forms/public/feedback");
  await expect(page.getByLabel(/^First name/)).toHaveAttribute("data-field-icon", "user");
  await page.evaluate(() => {
    const section = document.createElement("section");
    section.innerHTML = '<label for="placeholder-city">City (optional)</label><input id="placeholder-city"><label>Prayer request<textarea></textarea></label><input aria-label="Personal website" placeholder="https://example.org"><input aria-label="Access password" type="password"><input name="hidden-hint" type="hidden"><input aria-label="One-time code digit" maxlength="1">';
    document.body.append(section);
  });
  await expect(page.getByLabel("City (optional)", { exact: true })).toHaveAttribute("placeholder", "Enter city");
  await expect(page.getByLabel("Prayer request", { exact: true })).toHaveAttribute("placeholder", "Enter prayer request");
  await expect(page.getByLabel("Personal website", { exact: true })).toHaveAttribute("placeholder", "https://example.org");
  await expect(page.getByLabel("Access password", { exact: true })).toHaveAttribute("placeholder", "Enter access password");
  await expect(page.getByLabel("One-time code digit", { exact: true })).toHaveAttribute("placeholder", "0");
  await expect(page.locator('[name="hidden-hint"]')).not.toHaveAttribute("placeholder");
  await page.getByLabel("City (optional)", { exact: true }).evaluate((field) => field.setAttribute("aria-label", "Town"));
  await expect(page.getByLabel("Town", { exact: true })).toHaveAttribute("placeholder", "Enter town");
});
