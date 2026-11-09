"use client";

import { useEffect } from "react";
import {
  isRecordDetailHref,
  isRecordOpenLabel,
} from "@/lib/record-row-navigation";

const ROW =
  'table[data-slot="table"] tbody tr, [role="table"] [role="row"], [data-record-row]';
const INTERACTIVE =
  'a,button,input,select,textarea,label,[role="button"],[role="checkbox"],[role="switch"],[role="combobox"],[contenteditable="true"],[data-row-click-ignore]';

function primary(row: HTMLElement): HTMLElement | undefined {
  if (
    row.dataset.rowHandled === "true" ||
    row.querySelector('th,[role="columnheader"]')
  )
    return;
  const usable = (control: HTMLElement) =>
    !control.closest('[hidden],[aria-hidden="true"]') &&
    !control.matches(':disabled,[aria-disabled="true"]');
  const marked = Array.from(
    row.querySelectorAll<HTMLElement>('[data-row-open="true"]'),
  ).find(usable);
  if (marked) return marked;
  const named = Array.from(
    row.querySelectorAll<HTMLElement>("button,a[href]"),
  ).find(
    (control) =>
      usable(control) &&
      !control.closest(".row-actions") &&
      isRecordOpenLabel(
        control.getAttribute("aria-label") || control.textContent || "",
      ),
  );
  if (named) return named;
  // The identifying cell may link to a detail page even without a Manage menu.
  const cells = Array.from(
    row.querySelectorAll<HTMLElement>(':scope > td,:scope > [role="cell"]'),
  );
  const cell = cells.find(
    (cell) => !cell.querySelector('input[type="checkbox"],[role="checkbox"]'),
  );
  return cell
    ? Array.from(cell.querySelectorAll<HTMLAnchorElement>("a[href]")).find(
        (link) =>
          usable(link) &&
          isRecordDetailHref(link.getAttribute("href") || "", location.href),
      )
    : undefined;
}

/** Shared across Paper grids, native tables and explicitly marked record lists. */
export function RecordRowNavigation() {
  useEffect(() => {
    const enhanced = new Map<
      HTMLElement,
      { tab: string | null; description: string | null }
    >();
    let frame = 0;
    const restore = (row: HTMLElement) => {
      const previous = enhanced.get(row);
      if (!previous) return;
      delete row.dataset.rowClickable;
      if (previous.tab === null) row.removeAttribute("tabindex");
      else row.setAttribute("tabindex", previous.tab);
      if (previous.description === null)
        row.removeAttribute("aria-description");
      else row.setAttribute("aria-description", previous.description);
      enhanced.delete(row);
    };
    const scan = () => {
      frame = 0;
      for (const row of enhanced.keys())
        if (!row.isConnected || !primary(row)) restore(row);
      document.querySelectorAll<HTMLElement>(ROW).forEach((row) => {
        const target = primary(row);
        if (!target || enhanced.has(row)) return;
        enhanced.set(row, {
          tab: row.getAttribute("tabindex"),
          description: row.getAttribute("aria-description"),
        });
        row.dataset.rowClickable = "true";
        if (!row.hasAttribute("tabindex")) row.tabIndex = 0;
        if (!row.hasAttribute("aria-description"))
          row.setAttribute(
            "aria-description",
            "Press Enter to open this record.",
          );
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(scan);
    };
    const activate = (event: MouseEvent | KeyboardEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const row = event.target.closest<HTMLElement>(
        '[data-row-clickable="true"]',
      );
      if (!row || event.target.closest(INTERACTIVE)) return;
      if (
        event instanceof KeyboardEvent &&
        (event.target !== row || event.key !== "Enter")
      )
        return;
      if (
        event instanceof MouseEvent &&
        event.button !== 0 &&
        event.button !== 1
      )
        return;
      const selection = window.getSelection();
      if (
        selection &&
        !selection.isCollapsed &&
        selection.anchorNode &&
        row.contains(selection.anchorNode)
      )
        return;
      const target = primary(row);
      if (!target) return;
      // Do not bubble the delegated activation back to this row.
      event.preventDefault();
      if (
        target instanceof HTMLAnchorElement &&
        event instanceof MouseEvent &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)
      ) {
        window.open(target.href, "_blank", "noopener,noreferrer");
      } else if (!(event instanceof MouseEvent) || event.button === 0)
        target.click();
    };
    scan();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "href",
        "disabled",
        "hidden",
        "aria-disabled",
        "data-row-open",
        "data-row-handled",
      ],
    });
    document.addEventListener("click", activate);
    document.addEventListener("auxclick", activate);
    document.addEventListener("keydown", activate);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("click", activate);
      document.removeEventListener("auxclick", activate);
      document.removeEventListener("keydown", activate);
      for (const row of enhanced.keys()) restore(row);
    };
  }, []);
  return null;
}
