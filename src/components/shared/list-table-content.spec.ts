import { createElement, Fragment, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ListPaginationFooter } from "./list-pagination";
import { splitListPagination } from "./list-table-content";

const footer = () => createElement(ListPaginationFooter, { page: 2, perPage: 15, total: 40, onPageChange: () => {} });
describe("register pagination outside the horizontal scroller", () => {
  it("preserves record keys and references while lifting pagination", () => {
    const row = createElement("div", { key: "member.opaque$id" }, "Record");
    const pagination = footer();
    const result = splitListPagination([row, pagination]);
    expect((result.rows as ReactElement[])[0]).toBe(row);
    expect((result.rows as ReactElement[])[0].key).toBe("member.opaque$id");
    expect(result.pagination).toEqual([pagination]);
    expect(result.pagination[0]).toBe(pagination);
    expect((result.rows as ReactElement[])[1]).toBeNull();
  });
  it("removes a footer-only card wrapper without dropping neighbouring records", () => {
    const row = createElement("div", { key: "record" }, "Record");
    const pagination = footer();
    const wrapper = createElement("div", { className: "paper-card" }, pagination);
    const result = splitListPagination(createElement(Fragment, null, row, wrapper));
    expect(result.pagination).toEqual([pagination]);
    const children = (result.rows as ReactElement<{ children: unknown[] }>).props.children;
    expect(children[0]).toBe(row);
    expect(children[1]).toBeNull();
  });
  it("leaves an unchanged table tree alone when pagination is supplied outside it", () => {
    const content = createElement("div", { className: "rows" }, [createElement("div", { key: "record" }, "Record")]);
    const result = splitListPagination(content);
    expect(result.rows).toBe(content);
    expect(result.pagination).toEqual([]);
  });
});
