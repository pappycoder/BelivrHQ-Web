"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Measure actual columns so custom cells, column visibility and resizing stay aligned. */
export function useTableLayout(root: RefObject<HTMLDivElement | null>) {
  const numericWidths = useRef(new WeakMap<HTMLTableCellElement, number>());
  useEffect(() => {
    const container = root.current;
    const table = container?.querySelector("table");
    if (!container || !table) return;
    const scrollArea = table.parentElement!;
    const updateScrollState = () => {
      const overflowing = scrollArea.scrollWidth > scrollArea.clientWidth + 1;
      scrollArea.dataset.scrolledHorizontally = String(
        overflowing && Math.abs(scrollArea.scrollLeft) > 1,
      );
    };
    let frame = 0;
    const measure = () => {
      const heads = Array.from(table.tHead?.rows[0]?.cells ?? []);
      const sizes: string[] = JSON.parse(table.dataset.columnWidths || "[]");
      const compact = table.dataset.compactColumns === "true";
      const isNumeric = heads.map((head, index) => {
        if (head.dataset.declaredValueType) return head.dataset.declaredValueType !== "text";
        if (/\b(id|code|reference|phone|year|date|zip|postcode)\b/i.test(head.textContent || ""))
          return false;
        const values = Array.from(table.tBodies[0]?.rows ?? [])
          .map((row) => row.cells[index]?.textContent?.trim() || "")
          .filter((value) => value && value !== "Not available" && value !== "–" && value !== "-");
        return (
          values.length > 0 &&
          values.every((value) =>
            /^[+-]?\d+(?:\.\d+)?%?$/.test(
              value.replace(/[\p{Sc}\s,]/gu, "").replace(/^[A-Z]{3}|[A-Z]{3}$/g, ""),
            ),
          )
        );
      });
      heads.forEach((head, index) => {
        const columnCompact =
          sizes[index] === "compact" || (sizes[index] !== "expanded" && compact);
        if (isNumeric[index] && (!columnCompact || !numericWidths.current.has(head))) {
          const width = head.getBoundingClientRect().width;
          if (width > 0) numericWidths.current.set(head, width);
        }
      });
      const actions = new Set<number>();
      const pinned: number[] = [];
      heads.forEach((head, index) => {
        const label = head.textContent?.trim() ?? "";
        if (/^(actions?|options?|manage)$/i.test(label)) actions.add(index);
        else if (
          !head.hidden &&
          head.getClientRects().length > 0 &&
          label &&
          !head.querySelector('[role="checkbox"],input[type="checkbox"]') &&
          pinned.length < 2
        )
          pinned.push(index);
        else if (
          !label &&
          !head.querySelector('[role="checkbox"],input[type="checkbox"]') &&
          table.tBodies[0]?.rows[0]?.cells[index]?.querySelector(
            'button[aria-haspopup], [data-size^="icon"]',
          )
        )
          actions.add(index);
      });
      const selectionWidth =
        heads[0]?.querySelector('[role="checkbox"],input[type="checkbox"]') && !heads[0].hidden
          ? heads[0].getBoundingClientRect().width
          : 0;
      const offsets = pinned.map((_, i) =>
        pinned
          .slice(0, i)
          .reduce((sum, index) => sum + heads[index].getBoundingClientRect().width, selectionWidth),
      );
      Array.from(table.rows).forEach((row) => {
        let index = 0;
        Array.from(row.cells).forEach((cell) => {
          const numeric = isNumeric[index];
          cell.dataset.valueType = numeric ? "numeric" : "text";
          cell.dataset.columnSize =
            sizes[index] === "compact" || (sizes[index] !== "expanded" && compact)
              ? "compact"
              : "expanded";
          if (numeric && heads[index])
            cell.style.setProperty(
              "--table-numeric-width",
              `${numericWidths.current.get(heads[index]) ?? heads[index].getBoundingClientRect().width}px`,
            );
          if (index === 0 && selectionWidth > 0 && cell.colSpan === 1 && !cell.hidden)
            cell.dataset.pinnedSelection = "true";
          else delete cell.dataset.pinnedSelection;
          const pin = pinned.indexOf(index);
          if (pin >= 0 && cell.colSpan === 1 && !cell.hidden) {
            cell.dataset.pinnedColumn = String(pin);
            cell.style.setProperty("--pinned-start", `${offsets[pin]}px`);
          } else {
            delete cell.dataset.pinnedColumn;
            cell.style.removeProperty("--pinned-start");
          }
          if (actions.has(index) && cell.tagName === "TD" && cell.colSpan === 1)
            cell.dataset.rowActions = "true";
          else delete cell.dataset.rowActions;
          index += cell.colSpan;
        });
      });
      updateScrollState();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(container);
    Array.from(table.tHead?.rows[0]?.cells ?? []).forEach((cell) => resize.observe(cell));
    const changes = new MutationObserver(schedule);
    changes.observe(table, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "colspan", "data-compact-columns", "data-column-widths"],
    });
    scrollArea.addEventListener("scroll", updateScrollState, { passive: true });
    measure();
    return () => {
      scrollArea.removeEventListener("scroll", updateScrollState);
      resize.disconnect();
      changes.disconnect();
      cancelAnimationFrame(frame);
    };
  });
}
