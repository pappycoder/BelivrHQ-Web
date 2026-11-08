"use client";

import * as React from "react";
import { ArrowUpRight, UserRoundX, Users } from "lucide-react";
import { SectionCard } from "@/components/paper/section";
import {
  EmptyState,
  ListPaginationFooter,
  ManageHeading,
  PersonAvatar,
  RowActions,
  SearchField,
} from "@/components/paper/primitives";
import { Tag } from "@/components/paper/stat";
import { ListTable } from "@/components/shared/list-table";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import type { DepartmentMember } from "@/hooks/use-admin";

export function GroupMemberRoster({
  members,
  loading,
  error,
  onRetry,
  action,
  onRemove,
  tableId,
}: {
  members: DepartmentMember[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  action?: React.ReactNode;
  onRemove?: (member: DepartmentMember) => Promise<unknown>;
  tableId: string;
}) {
  const { canAny } = usePermissions();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(15);
  const rows = members.filter((member) =>
    `${member.firstName} ${member.lastName} ${member.role}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const effectivePage = Math.min(
    page,
    Math.max(1, Math.ceil(rows.length / perPage)),
  );
  const paged = rows.slice(
    (effectivePage - 1) * perPage,
    effectivePage * perPage,
  );
  return (
    <SectionCard
      eyebrow="The roster"
      title="Members"
      bodyClassName="p-0"
      actions={
        <>
          {action}
          <ExportDropdown
            tableId={tableId}
            title="Group members"
            filename="group-members"
            columns={[
              { key: "firstName", label: "First name" },
              { key: "lastName", label: "Last name" },
              { key: "role", label: "Role" },
              { key: "joinedAt", label: "Joined" },
            ]}
            data={rows.map((member) => ({ ...member }))}
            disabled={!rows.length}
          />
        </>
      }
    >
      <div className="p-4">
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search roster…"
          className="w-full max-w-xs"
        />
      </div>
      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Roster could not be loaded"
          action={
            onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )
          }
        />
      ) : !rows.length ? (
        <EmptyState
          icon={<Users />}
          title="No members match"
          description="Add members to this roster or clear your search."
        />
      ) : (
        <>
          <ListTable
            tableId={tableId}
            records={paged}
            recordKey="id"
            label="Group members"
            className="min-w-[520px]"
          >
            <div className="rule-label grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 border-y border-line px-5 py-3">
              <span>Member</span>
              <span>Role</span>
              <span>Joined</span>
              <ManageHeading />
            </div>
            {paged.map((member) => (
              <div
                key={member.id}
                className="group grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 border-b border-line/70 px-5 py-3 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PersonAvatar
                    name={`${member.firstName} ${member.lastName}`}
                    size="xs"
                  />
                  <span className="truncate font-medium">
                    {member.firstName} {member.lastName}
                  </span>
                </div>
                <span>
                  <Tag>{member.role.replaceAll("_", " ")}</Tag>
                </span>
                <span className="text-ink-faint">
                  {new Date(member.joinedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <RowActions
                  actions={[
                    canAny("members:all:read", "members:own:read") && {
                      label: `Open ${member.firstName} ${member.lastName}`,
                      icon: <ArrowUpRight />,
                      href: `/people/members/${member.memberId}`,
                    },
                    onRemove && {
                      label: `Remove ${member.firstName} ${member.lastName}`,
                      icon: <UserRoundX />,
                      tone: "danger",
                      confirmation: {
                        subject: `${member.firstName} ${member.lastName}`,
                        description:
                          "Remove this person from the roster? Their church membership and attendance history will be kept.",
                      },
                      bulk: {
                        key: "remove",
                        label: "Remove selected roster members",
                        destructive: true,
                        description:
                          "Remove these people from this roster? Their church membership and attendance history will be kept.",
                        run: () => onRemove(member),
                      },
                      onSelect: () => onRemove(member),
                    },
                  ]}
                />
              </div>
            ))}
          </ListTable>
          <ListPaginationFooter
            page={effectivePage}
            perPage={perPage}
            total={rows.length}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="members"
          />
        </>
      )}
    </SectionCard>
  );
}
