"use client";

import * as React from "react";
import { PageHeader as PaperPageHeader } from "@/components/paper/section";
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
    <PaperPageHeader
      className="workspace-page-header"
      title={titleMeta ? <span className="flex flex-wrap items-center gap-3">{title}<span className="font-sans text-sm">{titleMeta}</span></span> : title}
      description={description}
      actions={action}
      eyebrow={
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
      }
    />
  );
}
