"use client";

import { useEffect, type RefObject } from "react";

/** Resolve the rendered header, including responsive styles, for each logical column. */
export function useColumnAlignment(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let frame = 0;
    const apply = () => {
      const table = container.querySelector('table, [role="table"]');
      if (!table) return;
      const native = table instanceof HTMLTableElement;
      const heads = native
        ? Array.from(table.tHead?.rows[0]?.cells ?? [])
        : Array.from(
            table.querySelectorAll<HTMLElement>('[role="columnheader"]'),
          );
      const alignments: string[] = [];
      for (const head of heads) {
        const alignment = getComputedStyle(head).textAlign;
        const span = native ? (head as HTMLTableCellElement).colSpan : 1;
        for (let i = 0; i < span; i++) alignments.push(alignment);
      }
      const rows = native
        ? [
            ...Array.from(table.tBodies).flatMap((body) =>
              Array.from(body.rows),
            ),
            ...Array.from(table.tFoot?.rows ?? []),
          ]
        : Array.from(
            table.querySelectorAll<HTMLElement>('[role="row"]'),
          ).filter((row) => !row.querySelector('[role="columnheader"]'));
      for (const row of rows) {
        const cells = native
          ? Array.from((row as HTMLTableRowElement).cells)
          : Array.from(
              row.querySelectorAll<HTMLElement>(':scope > [role="cell"]'),
            );
        let index = 0;
        for (const cell of cells) {
          const span = native ? (cell as HTMLTableCellElement).colSpan : 1;
          const covered = alignments.slice(index, index + span);
          // A summary/empty row spanning unlike columns keeps its authored alignment.
          const alignment =
            covered.length === span &&
            covered.every((value) => value === covered[0])
              ? covered[0]
              : undefined;
          if (alignment) {
            if (cell.dataset.columnAlign !== alignment)
              cell.dataset.columnAlign = alignment;
          } else delete cell.dataset.columnAlign;
          index += span;
        }
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "colspan", "dir"],
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(container);
    window.addEventListener("resize", schedule);
    apply();
    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  });
}
