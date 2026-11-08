"use client";

import { useEffect } from "react";
import { inputPlaceholder } from "@/lib/input-placeholder";
import {
  FIELD_ICON_PATHS,
  fieldIconImage,
  fieldTextEdit,
  resolveFieldIcon,
  type FieldIcon,
} from "@/lib/field-feedback";

type TextControl = HTMLInputElement | HTMLTextAreaElement;
type AdornableControl = TextControl | HTMLSelectElement | HTMLButtonElement;
const fieldSelector =
  'input,textarea,select,[data-slot="select-trigger"],[data-slot="checkbox"]';
const nonTextTypes = new Set([
  "hidden",
  "file",
  "checkbox",
  "radio",
  "range",
  "color",
  "button",
  "submit",
  "reset",
  "image",
]);
const motionTypes = new Set([
  "text",
  "email",
  "tel",
  "search",
  "url",
  "password",
  "number",
]);
const editTypes = new Set([
  "insertText",
  "deleteContentBackward",
  "deleteContentForward",
]);

function isTextControl(value: EventTarget | null): value is TextControl {
  return (
    value instanceof HTMLTextAreaElement ||
    (value instanceof HTMLInputElement && !nonTextTypes.has(value.type))
  );
}
function isValidatable(
  value: EventTarget | null,
): value is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    value instanceof HTMLInputElement ||
    value instanceof HTMLTextAreaElement ||
    value instanceof HTMLSelectElement
  );
}
function isAdornable(value: EventTarget | null): value is AdornableControl {
  return (
    isTextControl(value) ||
    value instanceof HTMLSelectElement ||
    (value instanceof HTMLButtonElement &&
      value.matches('[data-slot="select-trigger"]'))
  );
}
function labelText(node: Node): string {
  if (
    node instanceof Element &&
    node.matches('input,textarea,select,button,svg,[aria-hidden="true"]')
  )
    return "";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  return Array.from(node.childNodes).map(labelText).join(" ");
}
function hasPrefix(control: AdornableControl) {
  const parent = control.parentElement;
  if (!parent) return false;
  if (
    parent.matches('[cmdk-input-wrapper],[data-slot="command-input-wrapper"]')
  )
    return true;
  return Array.from(parent.children).some(
    (node) =>
      node !== control &&
      (node.hasAttribute("data-field-prefix") ||
        (/absolute/.test(node.getAttribute("class") ?? "") &&
          /(?:left|start)-/.test(node.getAttribute("class") ?? ""))),
  );
}

/** One delegated controller covers shared, raw and dynamically generated fields without changing their DOM/ref contract. */
export function FieldFeedback() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const marked = new Set<AdornableControl>();
    const generatedPlaceholders = new WeakMap<TextControl, string>();
    const shakes = new Map<HTMLElement, Animation>();
    let before:
      | {
          control: TextControl;
          value: string;
          selected: boolean;
          composing: boolean;
        }
      | undefined;
    let composing = false;
    let clearMotion = () => {};

    function shake(control: HTMLElement) {
      if (
        typeof control.animate !== "function" ||
        reducedMotion.matches ||
        !control.isConnected ||
        !control.getClientRects().length
      )
        return;
      shakes.get(control)?.cancel();
      const animation = control.animate(
        [
          { translate: "0 0" },
          { translate: "-3px 0" },
          { translate: "3px 0" },
          { translate: "-2px 0" },
          { translate: "2px 0" },
          { translate: "0 0" },
        ],
        { duration: 300, easing: "ease-out", composite: "add" },
      );
      animation.id = "field-error-shake";
      shakes.set(control, animation);
      void animation.finished.then(
        () => {
          if (shakes.get(control) === animation) shakes.delete(control);
        },
        () => {},
      );
    }
    function enhance(control: AdornableControl) {
      if (
        control.hidden ||
        control.closest('[aria-hidden="true"],[data-bot-protection]')
      )
        return;
      if (isTextControl(control)) {
        const existing = control.getAttribute("placeholder");
        if (!existing?.trim() || existing === generatedPlaceholders.get(control)) {
          const labelledBy = (control.getAttribute("aria-labelledby") ?? "")
            .split(/\s+/)
            .map((id) => document.getElementById(id))
            .filter((node): node is HTMLElement => !!node)
            .map(labelText)
            .join(" ");
          const label = control.dataset.fieldLabel || control.getAttribute("aria-label") ||
            Array.from(control.labels ?? []).map(labelText).join(" ") || labelledBy || control.name;
          const placeholder = control instanceof HTMLInputElement && control.maxLength === 1
            ? "0"
            : inputPlaceholder(control instanceof HTMLTextAreaElement ? "textarea" : control.type, label);
          if (placeholder && existing !== placeholder) {
            generatedPlaceholders.set(control, placeholder);
            control.setAttribute("placeholder", placeholder);
          }
        }
      }
      marked.add(control);
      control.classList.add("app-field");
      if (
        control.dataset.prefixIcon === "none" ||
        (control instanceof HTMLInputElement && control.maxLength === 1)
      ) {
        delete control.dataset.fieldIcon;
        delete control.dataset.fieldPrefix;
        return;
      }
      const label = [
        control.dataset.fieldLabel,
        control.getAttribute("name"),
        control.getAttribute("aria-label"),
        control.getAttribute("autocomplete"),
        ...Array.from(control.labels ?? []).map(labelText),
        control.getAttribute("placeholder"),
      ]
        .filter(Boolean)
        .join(" ");
      const explicit = control.dataset.prefixIcon;
      const icon =
        explicit && Object.hasOwn(FIELD_ICON_PATHS, explicit)
          ? (explicit as FieldIcon)
          : resolveFieldIcon(
              control instanceof HTMLTextAreaElement
                ? "textarea"
                : control.type,
              label,
            );
      control.dataset.fieldIcon = icon;
      if (hasPrefix(control)) {
        control.dataset.fieldPrefix = "existing";
      } else {
        delete control.dataset.fieldPrefix;
        control.style.setProperty(
          "--field-icon-light",
          fieldIconImage(icon, "#64748b"),
        );
        control.style.setProperty(
          "--field-icon-dark",
          fieldIconImage(icon, "#a1a1aa"),
        );
        control.style.setProperty(
          "--field-icon-error",
          fieldIconImage(icon, "#dc2626"),
        );
      }
    }
    function scan(root: ParentNode) {
      if (root instanceof HTMLElement && isAdornable(root)) enhance(root);
      root
        .querySelectorAll('input,textarea,select,[data-slot="select-trigger"]')
        .forEach((node) => {
          if (isAdornable(node)) enhance(node);
        });
    }

    function showEdit(control: TextControl, previous: string) {
      clearMotion();
      if (typeof control.animate !== "function") return;
      const value = control.value;
      const edit = fieldTextEdit(previous, value);
      if (!edit.inserted && !edit.removed) return;
      const styles = getComputedStyle(control),
        rect = control.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const password =
        control instanceof HTMLInputElement && control.type === "password";
      // Passwords are masked before creating any mirror text nodes.
      const display = (text: string) =>
        password ? "•".repeat(Array.from(text).length) : text;
      const layer = document.createElement("div");
      layer.dataset.fieldMotion = edit.inserted ? "insert" : "delete";
      layer.setAttribute("aria-hidden", "true");
      Object.assign(layer.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        boxSizing: "border-box",
        pointerEvents: "none",
        zIndex: "2147483000",
        overflow: "hidden",
        margin: "0",
        borderStyle: "solid",
        borderColor: "transparent",
        borderWidth: styles.borderWidth,
        padding: styles.padding,
        color: styles.color,
        font: styles.font,
        letterSpacing: styles.letterSpacing,
        textAlign: styles.textAlign,
        direction: styles.direction,
        textTransform: styles.textTransform,
        fontKerning: styles.fontKerning,
        fontVariantNumeric: styles.fontVariantNumeric,
        fontFeatureSettings: styles.fontFeatureSettings,
        fontVariationSettings: styles.fontVariationSettings,
        wordSpacing: styles.wordSpacing,
        tabSize: styles.tabSize,
      });
      const clip = document.createElement("div");
      const multiline = control instanceof HTMLTextAreaElement;
      Object.assign(clip.style, {
        position: "relative",
        overflow: "hidden",
        width: `${control.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)}px`,
        height: "100%",
        display: multiline ? "block" : "flex",
        alignItems: "center",
      });
      const text = document.createElement("div");
      Object.assign(text.style, {
        minWidth: "100%",
        flexShrink: "0",
        whiteSpace: multiline ? "pre-wrap" : "pre",
        overflowWrap: multiline ? "break-word" : "normal",
        transform: `translate(${-control.scrollLeft}px, ${-control.scrollTop}px)`,
      });
      clip.append(text);
      layer.append(clip);
      const animations: Animation[] = [];
      if (edit.inserted) {
        text.append(document.createTextNode(display(edit.prefix)));
        const enter = document.createElement("span");
        enter.dataset.fieldEnter = "";
        enter.textContent = display(edit.inserted);
        enter.style.position = "relative";
        text.append(enter, document.createTextNode(display(edit.suffix)));
        animations.push(
          enter.animate(
            [
              { opacity: 0, top: "4px" },
              { opacity: 1, top: "0px" },
            ],
            { duration: 160, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" },
          ),
        );
      } else {
        text.textContent = display(value) || "\u200b";
        const ghost = text.cloneNode(false) as HTMLDivElement;
        Object.assign(ghost.style, {
          position: "absolute",
          left: "0",
          top: multiline ? "0" : "50%",
          color: "transparent",
          transform: `translate(${-control.scrollLeft}px, ${-control.scrollTop}px)${multiline ? "" : " translateY(-50%)"}`,
        });
        ghost.append(document.createTextNode(display(edit.prefix)));
        const exit = document.createElement("span");
        exit.dataset.fieldExit = "";
        exit.textContent = display(edit.removed);
        Object.assign(exit.style, {
          position: "relative",
          color: styles.color,
        });
        ghost.append(exit, document.createTextNode(display(edit.suffix)));
        clip.append(ghost);
        animations.push(
          exit.animate(
            [
              { opacity: 0.8, top: "0px" },
              { opacity: 0, top: "4px" },
            ],
            { duration: 140, easing: "ease-out", fill: "both" },
          ),
        );
      }
      document.body.append(layer);
      control.style.setProperty("--field-caret-color", styles.color);
      control.dataset.fieldAnimating = "true";
      let active = true;
      const timeout = window.setTimeout(() => clear(), 180);
      const clear = () => {
        if (!active) return;
        active = false;
        window.clearTimeout(timeout);
        layer.remove();
        animations.forEach((animation) => animation.cancel());
        delete control.dataset.fieldAnimating;
        control.style.removeProperty("--field-caret-color");
        if (clearMotion === clear) clearMotion = () => {};
      };
      clearMotion = clear;
      // Controlled formatters may change the value during React's input handler.
      queueMicrotask(() => {
        if (control.value !== value || !control.isConnected) clear();
      });
    }

    function onBeforeInput(event: Event) {
      clearMotion();
      if (!isTextControl(event.target)) {
        before = undefined;
        return;
      }
      const control = event.target;
      before = {
        control,
        value: control.value,
        selected: control.selectionStart !== control.selectionEnd,
        composing,
      };
    }
    function onInput(event: Event) {
      if (!isValidatable(event.target)) return;
      const control = event.target;
      if (control.validity.valid) {
        delete control.dataset.fieldNativeInvalid;
        if (control.dataset.fieldOwnedInvalid === "true") {
          control.removeAttribute("aria-invalid");
          delete control.dataset.fieldOwnedInvalid;
        }
      }
      if (!isTextControl(control)) return;
      const native = event as InputEvent,
        snapshot = before;
      before = undefined;
      if (
        reducedMotion.matches ||
        shakes.has(control) ||
        control.validity.badInput ||
        native.isComposing ||
        composing ||
        !snapshot ||
        snapshot.composing ||
        snapshot.selected ||
        snapshot.control !== control ||
        !editTypes.has(native.inputType) ||
        control.disabled ||
        control.readOnly ||
        (control instanceof HTMLInputElement && !motionTypes.has(control.type))
      )
        return;
      showEdit(control, snapshot.value);
    }
    function onInvalid(event: Event) {
      if (!isValidatable(event.target)) return;
      clearMotion();
      const control = event.target;
      control.dataset.fieldNativeInvalid = "true";
      // Leave form-library-owned ARIA state under that library's control.
      if (!control.hasAttribute("aria-invalid")) {
        control.dataset.fieldOwnedInvalid = "true";
        control.setAttribute("aria-invalid", "true");
      }
      shake(control);
    }
    function onReset(event: Event) {
      clearMotion();
      before = undefined;
      if (!(event.target instanceof HTMLFormElement)) return;
      event.target
        .querySelectorAll<TextControl>("[data-field-native-invalid]")
        .forEach((control) => {
          delete control.dataset.fieldNativeInvalid;
          if (control.dataset.fieldOwnedInvalid === "true") {
            control.removeAttribute("aria-invalid");
            delete control.dataset.fieldOwnedInvalid;
          }
        });
    }
    function onFocus(event: Event) {
      if (isAdornable(event.target)) enhance(event.target);
    }
    function onKey(event: KeyboardEvent) {
      if (
        event.ctrlKey ||
        event.metaKey ||
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "Tab",
          "Escape",
        ].includes(event.key)
      )
        clearMotion();
    }
    function onCompositionStart() {
      composing = true;
      before = undefined;
      clearMotion();
    }
    function onCompositionEnd() {
      composing = false;
      before = undefined;
    }
    function onSubmit(event: Event) {
      if (!(event.target instanceof HTMLFormElement)) return;
      event.target
        .querySelectorAll<HTMLElement>(
          '[aria-invalid="true"],[data-field-native-invalid="true"]',
        )
        .forEach(shake);
    }
    function onReducedMotion() {
      if (reducedMotion.matches) {
        clearMotion();
        shakes.forEach((animation) => animation.cancel());
        shakes.clear();
      }
    }
    scan(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") {
          record.addedNodes.forEach((node) => {
            if (node instanceof Element) scan(node);
          });
          if (record.removedNodes.length) {
            marked.forEach((control) => {
              if (!control.isConnected) marked.delete(control);
            });
            if (
              document.querySelector('[data-field-animating="true"]') === null
            )
              clearMotion();
          }
        } else if (record.target instanceof HTMLElement) {
          if (record.attributeName === "aria-invalid") {
            if (
              record.oldValue !== "true" &&
              record.target.getAttribute("aria-invalid") === "true" &&
              record.target.matches(fieldSelector) &&
              !record.target.hasAttribute("data-field-native-invalid")
            )
              shake(record.target);
          } else if (isAdornable(record.target)) enhance(record.target);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "aria-invalid",
        "type",
        "name",
        "id",
        "placeholder",
        "aria-label",
        "aria-labelledby",
        "autocomplete",
        "data-field-label",
        "data-prefix-icon",
      ],
    });
    const listeners: [string, EventListener][] = [
      ["beforeinput", onBeforeInput],
      ["input", onInput],
      ["invalid", onInvalid],
      ["focusin", onFocus],
      [
        "focusout",
        () => {
          before = undefined;
          clearMotion();
        },
      ],
      ["pointerdown", () => clearMotion()],
      ["keydown", onKey as EventListener],
      ["compositionstart", onCompositionStart],
      ["compositionend", onCompositionEnd],
      ["submit", onSubmit],
      ["reset", onReset],
    ];
    listeners.forEach(([name, listener]) =>
      document.addEventListener(name, listener, true),
    );
    const onMove = () => clearMotion();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    reducedMotion.addEventListener("change", onReducedMotion);
    return () => {
      observer.disconnect();
      clearMotion();
      shakes.forEach((animation) => animation.cancel());
      listeners.forEach(([name, listener]) =>
        document.removeEventListener(name, listener, true),
      );
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      reducedMotion.removeEventListener("change", onReducedMotion);
      marked.forEach((control) => {
        control.classList.remove("app-field");
        delete control.dataset.fieldIcon;
        delete control.dataset.fieldPrefix;
      });
    };
  }, []);
  return null;
}
