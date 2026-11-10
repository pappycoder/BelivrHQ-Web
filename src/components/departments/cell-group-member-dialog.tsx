"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";

import * as React from "react";
import { toast } from "@/lib/toast";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberCombobox } from "@/components/members/member-combobox";
import { useAddCellGroupMember, type CellGroupMember } from "@/hooks/use-admin";

interface CellGroupMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  existingMembers: CellGroupMember[];
}

export function CellGroupMemberDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  existingMembers,
}: CellGroupMemberDialogProps) {
  const addMember = useAddCellGroupMember(groupId);

  const [memberId, setMemberId] = React.useState("");
  const [memberName, setMemberName] = React.useState("");
  const [role, setRole] = React.useState("member");

  React.useEffect(() => {
    if (open) {
      setMemberId("");
      setMemberName("");
      setRole("member");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!memberId) return;
    addMember.mutate(
      { memberId, role: role || "member" },
      {
        onSuccess: () => {
          toast.success(`Member added to ${groupName}`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("Failed to add member", {
            description: error?.message || "Please try again.",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Add Member
          </DialogTitle>
          <DialogDescription>Add a member to {groupName}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RequiredFieldsNotice className="col-span-full" />
          <Label required>Member</Label>
          <MemberCombobox
            value={memberId}
            onChange={(id, member) => {
              setMemberId(id);
              setMemberName(member ? `${member.firstName} ${member.lastName}` : "");
            }}
            selectedName={memberName}
            excludeIds={existingMembers.map((m) => m.memberId)}
            placeholder="Select a member..."
          />
          <Label required>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="leader">Leader</SelectItem>
              <SelectItem value="assistant_leader">Assistant Leader</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!memberId || addMember.isPending}>
            {addMember.isPending ? "Adding..." : "Add to Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}