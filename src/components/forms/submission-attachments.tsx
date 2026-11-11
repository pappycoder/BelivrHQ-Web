"use client";

import * as React from "react";
import { useRef } from "react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { Paperclip, UploadCloud, X } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { mediaUploadPermissions } from "@/lib/media-upload-policy";
import { useUploadMediaFile, formatBytes, MEDIA_UPLOAD_LIMITS } from "@/hooks/use-media";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PendingAttachment {
  assetId: string;
  url: string;
  filename: string;
  size: number;
}

export interface SubmissionAttachmentsProps {
  onChange: (assetIds: string[]) => void;
  disabled?: boolean;
}

export function SubmissionAttachments({ onChange, disabled }: SubmissionAttachmentsProps) {
  const { canAny } = usePermissions();
  const canUpload = canAny(...mediaUploadPermissions("form-attachments"));
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadMediaFile();
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);

  const update = (next: PendingAttachment[]) => {
    setAttachments(next);
    onChange(next.map((a) => a.assetId));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const limit = file.type.startsWith("image/")
        ? MEDIA_UPLOAD_LIMITS.imageBytes
        : MEDIA_UPLOAD_LIMITS.fileBytes;
      if (file.size > limit) {
        toast.error("File too large", {
          description: `${file.name} exceeds the ${formatBytes(limit)} upload limit.`,
        });
        continue;
      }
      try {
        const res = await uploadMutation.mutateAsync({
          file,
          folder: "form-attachments",
        });
        update([...attachments, { assetId: res.assetId, url: res.url, filename: file.name, size: res.size }]);
        toast.success(`"${file.name}" attached`);
      } catch (err) {
        toast.error("Upload failed", {
          description: getToastErrorMessage(err, "Please try again."),
        });
      }
    }
  };

  const remove = (assetId: string) => {
    update(attachments.filter((a) => a.assetId !== assetId));
  };

  if (!canUpload) return null;

  return (
    <div className="space-y-2">
      <Label className="text-sm">
        <Paperclip className="mr-1 inline h-4 w-4" />
        Attachments
        <span className="ml-1 text-muted-foreground">(optional)</span>
      </Label>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloud className="mr-1 h-4 w-4" />
        {uploadMutation.isPending ? "Uploading…" : "Add files"}
      </Button>
      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.assetId}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{a.filename}</span>
              <span className="shrink-0 text-sm text-muted-foreground">{formatBytes(a.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={disabled}
                onClick={() => remove(a.assetId)}
                aria-label={`Remove ${a.filename}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
