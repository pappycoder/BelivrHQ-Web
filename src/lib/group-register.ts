export type GroupSort = "name" | "createdAt" | "leadership";
export interface GroupRegisterRecord {
  id: string;
  name: string;
  branchId?: string;
  branchName?: string;
  description?: string;
  address?: string;
  headMemberId?: string;
  headFirstName?: string;
  headLastName?: string;
  leaderId?: string;
  leaderFirstName?: string;
  leaderLastName?: string;
  meetingDay?: string;
  createdAt: string;
}
export const hasGroupLeader = (record: GroupRegisterRecord) =>
  !!(record.headMemberId || record.leaderId);

export function filterGroupRegister<T extends GroupRegisterRecord>(
  records: T[],
  filters: {
    search: string;
    branch: string;
    leadership: string;
    day: string;
    sort: GroupSort;
    ascending: boolean;
  },
): T[] {
  const terms = filters.search
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return records
    .filter((record) => {
      const text = [
        record.name,
        record.description,
        record.address,
        record.branchName,
        record.headFirstName,
        record.headLastName,
        record.leaderFirstName,
        record.leaderLastName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return (
        terms.every((term) => text.includes(term)) &&
        (filters.branch === "all" ||
          (record.branchId || "unassigned") === filters.branch) &&
        (filters.leadership === "all" ||
          hasGroupLeader(record) === (filters.leadership === "assigned")) &&
        (filters.day === "all" ||
          record.meetingDay?.toLowerCase() === filters.day.toLowerCase())
      );
    })
    .sort((a, b) => {
      const comparison =
        filters.sort === "createdAt"
          ? a.createdAt.localeCompare(b.createdAt)
          : filters.sort === "leadership"
            ? Number(hasGroupLeader(a)) - Number(hasGroupLeader(b))
            : a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base",
              });
      return (
        (filters.ascending ? comparison : -comparison) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
      );
    });
}
