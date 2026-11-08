"use client";

import * as React from "react";
import { DepartmentDetailContent } from "@/components/departments/department-detail-content";

export default function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ deptId: string }>;
}) {
  const { deptId } = React.use(params);

  return <DepartmentDetailContent departmentId={deptId} />;
}
