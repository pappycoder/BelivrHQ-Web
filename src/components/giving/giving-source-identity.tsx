import type { ReactNode } from "react";
import { HandCoins, UserRound, Users } from "lucide-react";
import { PersonAvatar } from "@/components/paper/primitives";
import type { GivingTransaction } from "@/hooks/use-giving";
import { givingSource } from "@/lib/giving-source";

export function GivingSourceIdentity({
  transaction,
  children,
}: {
  transaction: GivingTransaction;
  children?: ReactNode;
}) {
  const source = givingSource(transaction);
  const Icon =
    source.kind === "cell_group"
      ? Users
      : source.kind === "member"
        ? UserRound
        : HandCoins;
  return (
    <span
      className="flex min-w-0 flex-1 items-center gap-2.5"
      data-giving-source={source.kind}
    >
      {source.kind === "member" && transaction.memberName?.trim() ? (
        <PersonAvatar name={source.label} size="xs" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"
        >
          <Icon className="size-3.5" />
        </span>
      )}
      <span className="min-w-0">
        <span
          className="block truncate text-xs font-medium"
          title={source.label}
        >
          {source.label}
        </span>
        {children}
      </span>
    </span>
  );
}
