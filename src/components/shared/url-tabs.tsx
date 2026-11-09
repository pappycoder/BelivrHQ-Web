"use client";

import { Suspense, type ComponentProps, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

type UrlTabsProps = Omit<
  ComponentProps<typeof Tabs>,
  "value" | "onValueChange" | "children"
> & {
  children?: ReactNode | ((activeTab: string) => ReactNode);
  defaultValue: string;
  values: string[];
};

function UrlTabsContent({
  defaultValue,
  values,
  children,
  ...props
}: UrlTabsProps) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const value =
    requested && values.includes(requested) ? requested : defaultValue;

  return (
    <Tabs
      {...props}
      value={value}
      onValueChange={(next) => {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", next);
        window.history.pushState(null, "", url);
      }}
    >
      {typeof children === "function" ? children(value) : children}
    </Tabs>
  );
}

/** Preserve other query parameters and browser history without remounting drafts. */
export function UrlTabs({ values, children, ...props }: UrlTabsProps) {
  return (
    <Suspense
      fallback={
        <Tabs {...props}>
          {typeof children === "function"
            ? children(props.defaultValue)
            : children}
        </Tabs>
      }
    >
      <UrlTabsContent {...props} values={values}>
        {children}
      </UrlTabsContent>
    </Suspense>
  );
}
