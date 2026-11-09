"use client";

import * as React from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { checkRule, matchRoutePermission } from "@/lib/route-permissions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface BreadcrumbItemDef {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  titleMeta?: React.ReactNode;
  breadcrumbs: BreadcrumbItemDef[];
  action?: React.ReactNode;
  description?: string;
}

export function PageHeader({ title, titleMeta, breadcrumbs, action, description }: PageHeaderProps) {
  const { ready, canAny } = usePermissions();
  return (
    <div className="workspace-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="workspace-page-heading min-w-0">
        {titleMeta ? <div className="mb-2 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>{titleMeta}</div> : <h1 className="text-2xl font-bold tracking-tight mb-2 md:text-3xl">{title}</h1>}
        {description && <p className="mb-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/home">
                <Home className="h-4 w-4" /><span className="sr-only">Home</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.filter((item) => !(item.href === "/home" || item.href === "/dashboard" || /^(home|dashboard)$/i.test(item.label))).map((item, i) => (
              <React.Fragment key={i}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {item.href && ready && checkRule(matchRoutePermission(item.href), canAny) ? (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {action && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:justify-end [&>div]:flex-wrap">{action}</div>}
    </div>
  );
}
