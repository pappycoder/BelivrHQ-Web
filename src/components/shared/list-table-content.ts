import * as React from "react";
import { ListPaginationFooter } from "./list-pagination";

/** Lift pagination out of the scrolling grid without rewriting record keys. */
export function splitListPagination(content: React.ReactNode) {
  const pagination: React.ReactElement[] = [];
  function strip(node: React.ReactNode): React.ReactNode {
    if (Array.isArray(node)) {
      const children = node.map(strip);
      return children.every((child, index) => child === node[index]) ? node : children;
    }
    if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return node;
    if (node.type === ListPaginationFooter) {
      pagination.push(node);
      return null;
    }
    if (node.props.children === undefined) return node;
    const before = pagination.length;
    const children = strip(node.props.children);
    if (children === node.props.children) return node;
    if (pagination.length > before && React.Children.toArray(children).length === 0) return null;
    return React.cloneElement(node, { children });
  }
  return { rows: strip(content), pagination };
}
