import type { PdfReportSection } from "./export-utils";

function visible(element: Element): boolean {
  return (
    element.getClientRects().length > 0 &&
    !element.closest('[hidden], [aria-hidden="true"], .sr-only') &&
    getComputedStyle(element).visibility !== "hidden"
  );
}
function dataText(element: Element): string {
  if (
    !visible(element) ||
    element.matches('input, select, textarea, [role="checkbox"], [data-export-ignore]')
  )
    return "";
  return Array.from(element.childNodes)
    .map((node) =>
      node.nodeType === Node.TEXT_NODE
        ? node.textContent
        : node instanceof Element
          ? dataText(node)
          : "",
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
function titleFor(element: Element, fallback: string): string {
  const labelled = element.getAttribute("aria-label");
  if (labelled) return labelled;
  const section = element.closest('section, [data-slot="card"]');
  const heading = section?.querySelector('h2, h3, h4, [data-slot="card-title"]');
  return (heading && dataText(heading)) || fallback;
}
/** Exports only currently rendered, visible data. Never reads query caches, inputs or hidden rows. */
export function collectVisibleData(
  root: Element,
  {
    includeTables = true,
    selectedOnly = false,
  }: { includeTables?: boolean; selectedOnly?: boolean } = {},
): PdfReportSection[] {
  const sections: PdfReportSection[] = [];
  for (const [index, table] of Array.from(
    includeTables ? root.querySelectorAll('table, [role="table"]') : [],
  ).entries()) {
    if (!visible(table) || table.closest('nav, [role="navigation"], [data-export-ignore]'))
      continue;
    const native = table.tagName === "TABLE";
    const heads = Array.from(table.querySelectorAll(native ? "thead tr:last-child th" : '[role="columnheader"]'));
    const selected = heads
      .map((head, i) => ({ label: dataText(head), i }))
      .filter((head) => head.label && !/^(actions?|manage|options?|select( all)?)$/i.test(head.label));
    if (!selected.length) continue;
    const rows = Array.from(table.querySelectorAll(native ? "tbody tr" : '[role="row"]'))
      .filter((row) => native || !!row.querySelector('[role="cell"]'))
      .filter(visible)
      .filter((row) => !selectedOnly || row.getAttribute("data-row-selected") === "true")
      .filter((row) => !row.querySelector("[colspan]"))
      .map((row) => {
        const cells = Array.from(row.children);
        return Object.fromEntries(
          selected.map((head, i) => [`column${i}`, cells[head.i] ? dataText(cells[head.i]) : ""]),
        );
      });
    if (!rows.length) continue;
    sections.push({
      title: titleFor(table, `Table ${index + 1}`),
      columns: selected.map((head, i) => ({ key: `column${i}`, label: head.label })),
      data: rows,
      description:
        "Visible rows with current filters and column selection. Other pages are not included.",
    });
  }
  if (selectedOnly) return sections;
  for (const [index, list] of Array.from(
    root.querySelectorAll('ul, ol, [role="list"], [data-export-list]'),
  ).entries()) {
    if (
      !visible(list) ||
      list.closest(
        'nav, [role="navigation"], [role="menu"], [role="listbox"], [data-slot="breadcrumb"], form, table, [data-export-ignore]',
      )
    )
      continue;
    if (list.parentElement?.closest('ul, ol, [role="list"], [data-export-list]')) continue;
    const data = Array.from(list.children)
      .filter(visible)
      .map((element) => ({ item: dataText(element) }))
      .filter((row) => row.item);
    if (data.length)
      sections.push({
        title: titleFor(list, `List ${index + 1}`),
        columns: [{ key: "item", label: "Item" }],
        data,
        description: "Visible list items. Other pages are not included.",
      });
  }
  return sections;
}
