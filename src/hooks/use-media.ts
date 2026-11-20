"use client";

import { directMediaUpload } from "@/lib/direct-media-upload";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatRecordDate } from "@/lib/record-date";
import { usePermissions } from "@/hooks/use-permissions";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

/** Shape returned by the media library endpoints (MediaAssetResponseDto). */
export interface MediaAsset {
  assetId: string;
  churchId: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
  permissions: "public" | "members" | "leadership";
  createdAt: string;
}

export interface MediaLibraryResponse {
  data: MediaAsset[];
  total: number;
}

/** Shape returned by the media folder summary endpoint (MediaFolderSummaryDto). */
export interface MediaFolderSummary {
  folder: string;
  count: number;
  newestAt: string | null;
}

export interface UploadMediaResponse {
  assetId: string;
  url: string;
  path: string;
  width?: number;
  height?: number;
  size: number;
  contentType: string;
}

export type MediaSortBy = "created_at" | "filename" | "size_bytes";
export type MediaSortOrder = "asc" | "desc";

export interface ListMediaParams {
  page?: number;
  limit?: number;
  folder?: string;
  mimeType?: string;
  permissions?: "public" | "members" | "leadership";
  search?: string;
  sortBy?: MediaSortBy;
  sortOrder?: MediaSortOrder;
  branchId?: string;
}

export interface UpdateMediaPermissionsInput {
  assetId: string;
  permissions: MediaAsset["permissions"];
}

export const MEDIA_PERMISSION_LABELS: Record<MediaAsset["permissions"], string> = {
  public: "Public",
  members: "Members",
  leadership: "Leadership",
};

export const MEDIA_PERMISSION_TEXT: Record<
  MediaAsset["permissions"],
  string
> = {
  public: "text-sky-600",
  members: "text-emerald-600",
  leadership: "text-amber-600",
};

export type MediaKind = "image" | "audio" | "video" | "document";

const MIME_KIND_PREFIXES: Record<MediaKind, string> = {
  image: "image/",
  audio: "audio/",
  video: "video/",
  document: "application/",
};

export function classifyMime(mimeType: string | undefined): MediaKind {
  if (!mimeType) return "document";
  for (const kind of Object.keys(MIME_KIND_PREFIXES) as MediaKind[]) {
    if (mimeType.startsWith(MIME_KIND_PREFIXES[kind])) return kind;
  }
  return "document";
}

export function mimePrefixForKind(kind: MediaKind | "all"): string | undefined {
  return kind === "all" ? undefined : MIME_KIND_PREFIXES[kind];
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(createdAt: string | undefined): string {
  return formatRecordDate(createdAt);
}

// ─── Helpers ─────────────────────────────────────────────

function buildQuery(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function invalidateMediaCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["media-library"] });
  qc.invalidateQueries({ queryKey: ["media-folders"] });
}

function invalidateMediaAssetCaches(qc: ReturnType<typeof useQueryClient>, assetId: string) {
  qc.invalidateQueries({ queryKey: ["media-asset", assetId] });
  invalidateMediaCaches(qc);
}

// ─── Library (paginated) ─────────────────────────────────

export function useMediaLibrary(params: ListMediaParams = {}) {
  return useQuery({
    queryKey: ["media-library", params],
    queryFn: ({ signal }) =>
      api.get<MediaLibraryResponse>(`/media/library${buildQuery({ ...params })}`, { signal }),
  });
}

// ─── Folders ─────────────────────────────────────────────

/**
 * Shared query fn for the folders endpoint. Exported so `lib/prefetch.ts`
 * warms the cache with the EXACT same shape this hook reads — the two MUST
 * stay in lockstep, or a prefetched entry can poison the mounted page
 * (the `/media` "eA.map is not a function" boundary crash).
 */
export async function fetchMediaFolders(context?: { signal?: AbortSignal }): Promise<MediaFolderSummary[]> {
  const res = await api.get<{ data: MediaFolderSummary[] }>(
    "/media/library/folders", { signal: context?.signal }
  );
  return res.data;
}

export function useMediaFolders() {
  const { can } = usePermissions();
  return useQuery({
    enabled: can("media:folders", "read"),
    queryKey: ["media-folders"],
    queryFn: fetchMediaFolders,
    staleTime: 60 * 1000,
  });
}

// ─── Single asset ────────────────────────────────────────

export function useMediaAsset(assetId: string) {
  return useQuery({
    queryKey: ["media-asset", assetId],
    queryFn: ({ signal }) => api.get<MediaAsset>(`/media/library/${assetId}`, { signal }),
    enabled: !!assetId,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useUpdateMediaPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, permissions }: UpdateMediaPermissionsInput) =>
      api.patch<MediaAsset>(`/media/library/${assetId}/permissions`, { permissions }),
    onSuccess: (_data, { assetId }) => invalidateMediaAssetCaches(qc, assetId),
  });
}

export function useDeleteMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => api.delete<void>(`/media/library/${assetId}`),
    onSuccess: () => invalidateMediaCaches(qc),
  });
}

export function useUploadMediaFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folder, branchId }: { file: File; folder: string; branchId?: string }) => {
      // Keep large file bytes outside the web/API function request limits.
      if (!file.type.startsWith("image/"))
        return directMediaUpload(file, folder, branchId);
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      if (branchId) form.append("branchId", branchId);
      const isImage = file.type.startsWith("image/");
      return api.post<UploadMediaResponse>(
        isImage ? "/media/upload/image" : "/media/upload",
        form,
      );
    },
    onSuccess: () => invalidateMediaCaches(qc),
  });
}

export const MEDIA_UPLOAD_LIMITS = {
  imageBytes: 5 * 1024 * 1024,
  fileBytes: 50 * 1024 * 1024,
} as const;
