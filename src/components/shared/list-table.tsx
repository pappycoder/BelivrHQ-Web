"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ColumnSelector } from "@/components/shared/column-selector";
import { VisibleDataExport } from "@/components/shared/visible-data-export";
import { BulkManage } from "@/components/shared/bulk-manage";
import {
  BulkRegistryContext,
  BulkRowContext,
  type BulkRowRegistration,
} from "@/contexts/list-bulk-context";
import { useTableColumns } from "@/contexts/table-columns-context";
import {
  inferRecordType,
  recordFieldColumns,
  recordFieldText,
  recordFieldValue,
  recordLookup,
} from "@/lib/record-fields";
import { cn } from "@/lib/utils";
import { ManageHeading } from "@/components/paper/primitives";

interface NodeProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hidden?: boolean;
  role?: string;
}
function nodes(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<NodeProps>(child) && child.type === React.Fragment
      ? nodes(child.props.children)
      : [child],
  );
}
function text(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!React.isValidElement<NodeProps>(node)) return "";
  if (node.type === ManageHeading) return "Manage";
  return nodes(node.props.children).map(text).join(" ").trim();
}
function template(className = "") {
  return className.match(/(?:^|\s)(?:\w+:)?grid-cols-\[([^\]]+)\]/)?.[1];
}
/** Split CSS tracks without splitting inside minmax/repeat functions. */
export function gridTracks(source: string): string[] {
  const tracks: string[] = [];
  let level = 0;
  let token = "";
  for (const char of source.replaceAll("_", " ")) {
    if (char === "(") level++;
    if (char === ")") level--;
    if (/\s/.test(char) && level === 0) {
      if (token) tracks.push(token);
      token = "";
    } else token += char;
  }
  if (token) tracks.push(token);
  return tracks.flatMap((track) => {
    const repeated = track.match(/^repeat\((\d+),\s*(.*)\)$/);
    return repeated
      ? Array.from({ length: Number(repeated[1]) }, () =>
          gridTracks(repeated[2]),
        ).flat()
      : [track];
  });
}

/** React-owned enhancement for Paper grid registers; preserves existing cell content and handlers. */
export function ListTable({
  children,
  className,
  tableId,
  label = "Records",
  records = [],
  recordKey,
  recordType,
  fields,
}: {
  children: React.ReactNode;
  className?: string;
  tableId: string;
  label?: string;
  records?: readonly object[];
  recordKey?: string;
  recordType?: string;
  fields?: readonly { key: string; label: string }[];
}) {
  const root = React.useRef<HTMLDivElement>(null);
  function findHeader(
    tree: React.ReactNode,
  ): React.ReactElement<NodeProps> | undefined {
    for (const node of nodes(tree)) {
      if (!React.isValidElement<NodeProps>(node)) continue;
      if (
        node.props.className?.includes("rule-label") &&
        template(node.props.className)
      )
        return node;
      const found = findHeader(node.props.children);
      if (found) return found;
    }
  }
  const header = findHeader(children);
  const source = template(header?.props.className) ?? "";
  const headings = nodes(header?.props.children);
  const baseColumns = headings.map((heading, index) => ({
    id: `column-${index}`,
    label: text(heading) || `Column ${index + 1}`,
    hideable: index > 0 && !/^(manage|actions?|options?)$/i.test(text(heading)),
  }));
  const extras = recordFieldColumns(records, {
    recordType: recordType ?? inferRecordType(tableId),
    fields,
    existingLabels: baseColumns.map((column) => column.label),
  });
  const manageIndex = baseColumns.findIndex((column) =>
    /^(manage|actions?|options?)$/i.test(column.label),
  );
  const beforeManage = manageIndex < 0 ? baseColumns.length : manageIndex;
  const declaredColumns = [
    ...baseColumns.slice(0, beforeManage),
    ...extras,
    ...baseColumns.slice(beforeManage),
  ];
  const state = useTableColumns(tableId, declaredColumns);
  const columns = [
    ...state.columns.filter(
      (column) => !/^(manage|actions?|options?)$/i.test(column.label),
    ),
    ...state.columns.filter((column) =>
      /^(manage|actions?|options?)$/i.test(column.label),
    ),
  ];
  const byId = recordLookup(records, recordKey);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, BulkRowRegistration>>(
    {},
  );
  const register = React.useCallback((id: string, row: BulkRowRegistration) => {
    setRows((previous) => ({ ...previous, [id]: row }));
    return () =>
      setRows((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
  }, []);
  const registry = React.useMemo(() => ({ register }), [register]);
  const visibleIds: string[] = [];
  function collect(tree: React.ReactNode, inheritedKey?: string) {
    React.Children.forEach(tree, (node) => {
      if (!React.isValidElement<NodeProps>(node)) return;
      const key = node.key != null ? String(node.key) : inheritedKey;
      if (
        source &&
        template(node.props.className) === source &&
        !node.props.className?.includes("rule-label") &&
        key != null
      )
        visibleIds.push(key);
      else collect(node.props.children, key);
    });
  }
  collect(children);
  const tracks = gridTracks(source);
  const gridTemplateColumns = [
    "40px",
    ...columns.flatMap((column) =>
      state.hidden.includes(column.id)
        ? []
        : [
            column.id.startsWith("field:")
              ? "160px"
              : (tracks[Number(column.id.slice(7))] ?? "minmax(0,1fr)"),
          ],
    ),
  ].join(" ");
  const extraCount = columns.filter(
    (column) =>
      column.id.startsWith("field:") && !state.hidden.includes(column.id),
  ).length;
  const originalWidth = Number(
    className?.match(/min-w-\[(\d+)px\]/)?.[1] ?? baseColumns.length * 120,
  );
  function enhance(
    tree: React.ReactNode,
    inheritedKey?: string,
  ): React.ReactNode {
    return React.Children.map(tree, (node) => {
      if (!React.isValidElement<NodeProps>(node)) return node;
      const key = node.key != null ? String(node.key) : inheritedKey;
      const isHeader =
        !!node.props.className?.includes("rule-label") &&
        template(node.props.className) === source;
      const isRow =
        template(node.props.className) === source &&
        !!source &&
        !isHeader &&
        key != null;
      if (isHeader || isRow) {
        const id = key ?? "";
        const cells = nodes(node.props.children);
        const name = text(cells[0]) || id;
        const cellNodes = columns.map((column) => {
          const index = column.id.startsWith("column-")
            ? Number(column.id.slice(7))
            : -1;
          const value =
            index >= 0
              ? cells[index]
              : isHeader
                ? column.label
                : recordFieldText(
                    recordFieldValue(
                      byId.get(id),
                      JSON.parse(column.id.slice(6)),
                    ),
                  );
          return (
            <div
              key={column.id}
              role={isHeader ? "columnheader" : "cell"}
              hidden={state.hidden.includes(column.id)}
              className="list-table-cell min-w-0"
              data-list-column={column.id}
            >
              {index >= 0 ? (
                value
              ) : (
                <span
                  className="block truncate text-[11px]"
                  title={typeof value === "string" ? value : undefined}
                >
                  {value}
                </span>
              )}
            </div>
          );
        });
        const row = React.cloneElement(node, {
          role: "row",
          style: { ...node.props.style, display: "grid", gridTemplateColumns },
          ...(!isHeader
            ? { "data-row-selected": String(selected.includes(id)) }
            : {}),
          children: [
            <div
              key="selection"
              role={isHeader ? "columnheader" : "cell"}
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                disabled={isHeader && !visibleIds.length}
                aria-label={
                  isHeader ? "Select all visible rows" : `Select ${name}`
                }
                checked={
                  isHeader
                    ? visibleIds.length > 0 &&
                      visibleIds.every((key) => selected.includes(key))
                      ? true
                      : selected.length
                        ? "indeterminate"
                        : false
                    : selected.includes(id)
                }
                onCheckedChange={() =>
                  isHeader
                    ? setSelected(
                        visibleIds.length &&
                          visibleIds.every((key) => selected.includes(key))
                          ? []
                          : [...visibleIds],
                      )
                    : setSelected((previous) =>
                        previous.includes(id)
                          ? previous.filter((key) => key !== id)
                          : [...previous, id],
                      )
                }
              />
            </div>,
            ...cellNodes,
          ],
        } as Partial<NodeProps>);
        return isHeader ? (
          row
        ) : (
          <BulkRowContext.Provider key={id} value={{ id, name }}>
            {row}
          </BulkRowContext.Provider>
        );
      }
      return React.cloneElement(node, {
        children: enhance(node.props.children, key),
      });
    });
  }
  const enhanced = enhance(children);
  const visibleSignature = JSON.stringify(visibleIds);
  React.useEffect(() => {
    const ids: string[] = JSON.parse(visibleSignature);
    setSelected((previous) => {
      const next = previous.filter((id) => ids.includes(id));
      return next.length === previous.length ? previous : next;
    });
  }, [visibleSignature]);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  if (!header) return <div className={className}>{children}</div>;
  return (
    <BulkRegistryContext.Provider value={registry}>
      <div
        ref={root}
        data-list-table={tableId}
        className={cn(
          "w-full overflow-x-auto",
          className?.replace(/min-w-\[[^\]]+\]|\bdivide-\S+/g, ""),
        )}
      >
        <div
          data-export-ignore
          className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2"
        >
          <Checkbox
            disabled={!visibleIds.length}
            aria-label="Select all visible records"
            checked={
              allSelected ? true : selected.length ? "indeterminate" : false
            }
            onCheckedChange={() => setSelected(allSelected ? [] : visibleIds)}
          />
          <span className="mr-auto text-xs text-muted-foreground" role="status">
            {selected.length
              ? `${selected.length} selected on this page`
              : `${visibleIds.length} records on this page`}
          </span>
          <BulkManage
            selected={selected}
            rows={rows}
            onResolved={(ids) =>
              setSelected((previous) =>
                previous.filter((id) => !ids.includes(id)),
              )
            }
          />
          {!!selected.length && (
            <>
              <VisibleDataExport
                getRoot={() => root.current}
                selectedOnly
                label="Export selected rows"
              />
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear selection
              </Button>
            </>
          )}
          <ColumnSelector
            columns={columns}
            hidden={state.hidden}
            onChange={state.setHidden}
          />
        </div>
        <div
          role="table"
          aria-label={label}
          style={
            extraCount
              ? { minWidth: originalWidth + extraCount * 160 }
              : undefined
          }
          className={className
            ?.match(/min-w-\[[^\]]+\]|\bdivide-\S+/g)
            ?.join(" ")}
        >
          {enhanced}
        </div>
      </div>
    </BulkRegistryContext.Provider>
  );
}
