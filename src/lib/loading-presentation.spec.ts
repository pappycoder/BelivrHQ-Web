import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LoadingState } from "@/components/shared/loading-state";
import { SubscriptionPrice } from "@/components/billing/subscription-currency";
import type { useSubscriptionPricing } from "@/hooks/use-subscription-pricing";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

describe("content loading presentation", () => {
  it.each(["inline", "table", "cards", "detail", "form", "spinner"] as const)(
    "%s is an accessible skeleton without visible loading copy",
    (variant) => {
      const html = renderToStaticMarkup(
        createElement(LoadingState, {
          label: "Loading example",
          variant,
          rows: 2,
        }),
      );
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Loading example"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('data-slot="skeleton"');
      expect(html).not.toContain("animate-spin");
      const visibleText = html
        .replace(/<span class="sr-only">.*?<\/span>/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();
      expect(visibleText).toBe("");
      if (variant === "inline") expect(html).not.toContain("<div");
    },
  );
  it("does not render the price hook loading sentinel as a price", () => {
    const price = vi.fn(() => "Loading price…");
    const pending = {
      currency: "NGN",
      isPending: true,
      isError: false,
      data: undefined,
      price,
    } as unknown as ReturnType<typeof useSubscriptionPricing>;
    const html = renderToStaticMarkup(
      createElement(SubscriptionPrice, {
        pricing: pending,
        plan: "essentials",
        cycle: "monthly",
      }),
    );
    expect(html).toContain('data-slot="skeleton"');
    expect(price).not.toHaveBeenCalled();
    const failed = renderToStaticMarkup(
      createElement(SubscriptionPrice, {
        pricing: { ...pending, isPending: false, isError: true },
        plan: "essentials",
        cycle: "monthly",
      }),
    );
    expect(failed).toContain("Rate unavailable");
    expect(failed).not.toContain('data-slot="skeleton"');
  });
  it("contains no bare Loading/Fetching/Checking paragraphs anywhere in application JSX", () => {
    const offenders: string[] = [];
    function scan(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) scan(filename);
        else if (filename.endsWith(".tsx")) {
          const source = ts.createSourceFile(
            filename,
            readFileSync(filename, "utf8"),
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX,
          );
          function visit(node: ts.Node) {
            if (
              ts.isJsxText(node) &&
              /\b(Loading|Fetching|Searching|Checking|Calculating|Parsing)\b/.test(
                node.text,
              ) &&
              node.text.trim()
            ) {
              let parent: ts.Node | undefined = node.parent;
              let hidden = false;
              while (parent) {
                if (
                  ts.isJsxElement(parent) &&
                  /className=["'][^"']*sr-only/.test(
                    parent.openingElement.getText(source),
                  )
                )
                  hidden = true;
                parent = parent.parent;
              }
              if (!hidden)
                offenders.push(
                  `${filename}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`,
                );
            }
            ts.forEachChild(node, visit);
          }
          visit(source);
        }
      }
    }
    scan(path.join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});
