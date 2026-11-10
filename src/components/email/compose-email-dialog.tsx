"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";

import * as React from "react";
import { toast, getToastErrorMessage } from "@/lib/toast";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecipientCombobox } from "@/components/email/recipient-combobox";
import {
  useSendEmail,
  type EmailContact,
} from "@/hooks/use-email";

const EMPTY_RECIPIENTS: EmailContact[] = [];

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyToId?: string;
  replySubject?: string;
  initialBody?: string;
  /** Pre-fill the "To" field — used when replying so the original sender is already selected. */
  initialRecipients?: EmailContact[];
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  replyToId,
  replySubject,
  initialBody = "",
  initialRecipients = EMPTY_RECIPIENTS,
}: ComposeEmailDialogProps) {
  const [selected, setSelected] = React.useState<EmailContact[]>([]);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  const resolvedSubject = subject || (replySubject ? `Re: ${replySubject}` : "");

  const sendEmail = useSendEmail();

  // Reset draft whenever the dialog opens or the target changes.
  React.useEffect(() => {
    if (open) {
      setSelected(initialRecipients);
      setSubject("");
      setBody(initialBody);
    }
  }, [open, initialBody, initialRecipients]);

  const toggleSelect = (contact: EmailContact) => {
    setSelected((prev) =>
      prev.some((s) => s.id === contact.id)
        ? prev.filter((s) => s.id !== contact.id)
        : [...prev, contact]
    );
  };

  const handleSend = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    if (!resolvedSubject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!body.trim()) {
      toast.error("Message is required");
      return;
    }
    try {
      await sendEmail.mutateAsync({
        recipientIds: selected.map((s) => s.id),
        subject: resolvedSubject.trim(),
        body: body.trim(),
        replyToId,
      });
      toast.success("Email sent");
      onOpenChange(false);
    } catch (err) {
      const message = getToastErrorMessage(err, "Failed to send email");
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{replyToId ? "Reply" : "Compose"}</DialogTitle>
          <DialogDescription>
            Send an internal message to a church teammate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RequiredFieldsNotice className="col-span-full" />
          {/* Recipients */}
          <div className="space-y-2">
            <Label required>To</Label>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="gap-1 pr-1.5"
                  >
                    {c.name}
                    <button type="button" aria-label={`Remove ${c.name}`} onClick={() => toggleSelect(c)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <RecipientCombobox
              excludeIds={selected.map((s) => s.id)}
              onToggle={toggleSelect}
              placeholder="Click to add recipients…"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label required htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder={replySubject ? `Re: ${replySubject}` : "Subject"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label required htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              rows={4}
              className="sm:min-h-[160px]"
              placeholder="Write your message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={sendEmail.isPending}
          >
            {sendEmail.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {replyToId ? "Send Reply" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
