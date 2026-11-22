import { Tag } from "@/components/paper/stat";

export function UserStatusBadge({ status }: { status: string }) {
  return (
    <Tag tone={status === "active" ? "moss" : "rose"} dot>
      {status === "active" ? "Active" : "Paused"}
    </Tag>
  );
}
