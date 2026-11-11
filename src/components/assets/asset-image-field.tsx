"use client";

import { LoadingIndicator } from "@/components/shared/loading-indicator";

import { ContentImage } from "@/components/shared/content-image";

import * as React from "react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { Image as ImageIcon, Link, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/use-permissions";
import { mediaUploadPermissions } from "@/lib/media-upload-policy";
import { MEDIA_UPLOAD_LIMITS, useUploadMediaFile } from "@/hooks/use-media";

const ASSET_IMAGE_FOLDER = "assets";

interface AssetImageFieldProps {
  value?: string;
  onChange: (url: string | undefined) => void;
}

type Mode = "upload" | "url";

export function AssetImageField({ value, onChange }: AssetImageFieldProps) {
  const [mode, setMode] = React.useState<Mode>("upload");
  const [urlInput, setUrlInput] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const { canAny } = usePermissions();
  const canUpload = canAny(...mediaUploadPermissions("assets"));
  const effectiveMode: Mode = canUpload ? mode : "url";

  const uploadMutation = useUploadMediaFile();
  const uploading = uploadMutation.isPending;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MEDIA_UPLOAD_LIMITS.imageBytes) {
      toast.error("Image too large", {
        description: "Images must be 5 MB or smaller.",
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {

      const res = await uploadMutation.mutateAsync({
        file: selectedFile,
        folder: ASSET_IMAGE_FOLDER,
      });

      onChange(res.url);
      setSelectedFile(null);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Failed to upload image", {
        description: getToastErrorMessage(err, "Please try again."),
      });
    }
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setUrlInput("");
    toast.success("Image link saved");
  };

  const handleRemove = () => {
    onChange(undefined);
    setSelectedFile(null);
    setUrlInput("");
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (value) {
    return (
      <div className="space-y-2">
        <Label>Asset Image</Label>
        <div className="overflow-hidden rounded-md border bg-muted/40">
          <div className="border-b">
            <ContentImage
              src={value}
              alt="Asset image preview"
              className="max-h-40 w-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{value}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleRemove}
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Asset Image</Label>

      <div className="flex w-fit gap-1 rounded-md border p-0.5">
        {canUpload && (
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors ${
              effectiveMode === "upload"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("upload")}
          >
            <Upload className="h-3 w-3" />
            Upload File
          </button>
        )}
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors ${
            effectiveMode === "url"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMode("url")}
        >
          <Link className="h-3 w-3" />
          Paste Link
        </button>
      </div>

      {effectiveMode === "upload" ? (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {selectedFile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{selectedFile.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {formatSize(selectedFile.size)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setSelectedFile(null)}
                  aria-label="Remove selected image"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {uploading && <LoadingIndicator label="Uploading file" size="sm" />}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3 w-3" />
                )}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-3 w-3" />
              Choose Image File
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="url"
            placeholder="https://example.com/assets/mixer.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
          >
            <Link className="mr-2 h-3 w-3" />
            Save Link
          </Button>
        </div>
      )}
    </div>
  );
}
