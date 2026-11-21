"use client";

import { Tag, type Tone } from "@/components/paper/stat";
import {
  ASSET_CONDITION_LABELS,
  ASSET_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
  type AssetCondition,
  type AssetLoanStatus,
  type AssetStatus,
  type MaintenanceStatus,
} from "@/hooks/use-assets";

type StatusKind =
  | { kind: "status"; value: AssetStatus }
  | { kind: "condition"; value: AssetCondition }
  | { kind: "maintenance"; value: MaintenanceStatus }
  | { kind: "loan"; value: AssetLoanStatus };

const tones = {
  status: { active: "moss", maintenance: "gold", retired: "neutral", lost: "rose", disposed: "neutral" },
  condition: { new: "moss", good: "moss", fair: "gold", poor: "rose", damaged: "rose" },
  maintenance: { scheduled: "sky", in_progress: "gold", completed: "moss", cancelled: "neutral" },
  loan: { borrowed: "sky", returned: "moss", overdue: "rose" },
} satisfies {
  status: Record<AssetStatus, Tone>;
  condition: Record<AssetCondition, Tone>;
  maintenance: Record<MaintenanceStatus, Tone>;
  loan: Record<AssetLoanStatus, Tone>;
};

export function StatusBadge(props: StatusKind) {
  const { kind, value } = props;

  let label: string;
  let tone: Tone;
  switch (kind) {
    case "status":
      label = ASSET_STATUS_LABELS[value];
      tone = tones.status[value];
      break;
    case "condition":
      label = ASSET_CONDITION_LABELS[value];
      tone = tones.condition[value];
      break;
    case "maintenance":
      label = MAINTENANCE_STATUS_LABELS[value];
      tone = tones.maintenance[value];
      break;
    case "loan":
      label = LOAN_STATUS_LABELS[value];
      tone = tones.loan[value];
      break;
  }

  return (
    <Tag tone={tone} dot>
      {label}
    </Tag>
  );
}
