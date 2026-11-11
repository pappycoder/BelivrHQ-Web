"use client";

import { useId, useRef } from "react";
import { Upload, Link, X, FileAudio, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/use-permissions";
import { mediaUploadPermissions } from "@/lib/media-upload-policy";
import type { SermonRecordingDraft } from "@/lib/sermon-recording";

/** Files and links stay in this recording section until its Save action. */
export function MediaUploadField({
  label,
  accept,
  mediaType,
  value,
  onChange,
  disabled = false,
  error,
}: {
  label: string;
  accept: string;
  mediaType: "audio" | "video";
  value: SermonRecordingDraft;
  onChange: (draft: SermonRecordingDraft) => void;
  disabled?: boolean;
  error?: string;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const { canAny } = usePermissions();
  const canUpload = canAny(...mediaUploadPermissions("sermons"));
  const mode = canUpload ? value.mode : "url";
  const Icon = mediaType === "audio" ? FileAudio : FileVideo;
  return (
    <div data-sermon-upload className="space-y-3">
      <div
        className="flex w-fit flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
        aria-label={`${label} source`}
      >
        {canUpload && (
          <Button
            type="button"
            size="sm"
            variant={mode === "upload" ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={mode === "upload"}
            onClick={() => onChange({ ...value, mode: "upload" })}
          >
            <Upload className="h-4 w-4" /> Choose File
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={mode === "url" ? "default" : "outline"}
          disabled={disabled}
          aria-pressed={mode === "url"}
          onClick={() => onChange({ ...value, file: null, mode: "url" })}
        >
          <Link className="h-4 w-4" /> Paste Link
        </Button>
      </div>
      {mode === "upload" ? (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            aria-label={`${label} file`}
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onChange({ ...value, file });
              event.target.value = "";
            }}
          />
          {value.file ? (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${mediaType === "audio" ? "bg-blue-500/10 text-blue-600 dark:text-blue-300" : "bg-violet-500/10 text-violet-600 dark:text-violet-300"}`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {value.file.name}
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {(value.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove selected ${mediaType}`}
                disabled={disabled}
                onClick={() => onChange({ ...value, file: null })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : value.url ? (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${mediaType === "audio" ? "bg-blue-500/10 text-blue-600 dark:text-blue-300" : "bg-violet-500/10 text-violet-600 dark:text-violet-300"}`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span
                className="min-w-0 flex-1 truncate text-sm"
                title={value.url}
              >
                {value.url}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${mediaType} recording`}
                disabled={disabled}
                onClick={() => onChange({ ...value, url: "" })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />{" "}
            {value.file || value.url ? "Replace" : "Choose"} {label} File
          </Button>
          <p className="text-sm text-muted-foreground">
            The selected file uploads when you save {mediaType}. Maximum size:
            50 MB.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={id}>{label} link</Label>
          <Input
            id={id}
            value={value.url}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            placeholder={
              mediaType === "audio"
                ? "https://soundcloud.com/..."
                : "https://youtube.com/watch?v=..."
            }
            onChange={(event) =>
              onChange({ ...value, file: null, url: event.target.value })
            }
          />
          <p className="text-sm text-muted-foreground">
            This link is saved when you save {mediaType}.
          </p>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
