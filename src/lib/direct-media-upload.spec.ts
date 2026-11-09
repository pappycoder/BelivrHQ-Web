import { afterEach, describe, expect, it, vi } from "vitest";
import { directMediaUpload } from "./direct-media-upload";
import { api } from "./api";
vi.mock("./api", () => ({ api: { post: vi.fn() } }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(api.post).mockReset();
});
const file = () =>
  ({ name: "message.mp4", type: "video/mp4", size: 8 * 1024 * 1024 }) as File;
describe("direct storage uploads", () => {
  it("sends only metadata through BelivrHQ and bytes to a signed storage URL", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        uploadUrl: "https://storage.example/upload?token=short",
        ticket: "signed-ticket",
      })
      .mockResolvedValueOnce({
        assetId: "asset",
        url: "/api/backend/media/files/asset",
      });
    const video = file();
    await directMediaUpload(video, "sermons", "branch-a");
    expect(api.post).toHaveBeenNthCalledWith(1, "/media/upload/prepare", {
      filename: video.name,
      contentType: video.type,
      size: video.size,
      folder: "sermons",
      branchId: "branch-a",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://storage.example/upload?token=short",
      expect.objectContaining({
        method: "PUT",
        body: video,
        credentials: "omit",
      }),
    );
    expect(api.post).toHaveBeenNthCalledWith(2, "/media/upload/complete", {
      ticket: "signed-ticket",
    });
  });
  it("retries completion without transferring the large file again", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        uploadUrl: "https://storage.example/upload",
        ticket: "ticket",
      })
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce({ assetId: "saved" });
    const video = file();
    await expect(directMediaUpload(video, "sermons")).rejects.toThrow("503");
    await directMediaUpload(video, "sermons");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenLastCalledWith("/media/upload/complete", {
      ticket: "ticket",
    });
  });
  it("does not complete a failed transfer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    vi.mocked(api.post).mockResolvedValueOnce({
      uploadUrl: "https://storage.example/upload",
      ticket: "ticket",
    });
    await expect(directMediaUpload(file(), "sermons")).rejects.toThrow(
      "Storage upload failed (503)",
    );
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it("rejects oversized files before requesting a grant", async () => {
    await expect(
      directMediaUpload(
        { ...file(), size: 51 * 1024 * 1024 } as File,
        "sermons",
      ),
    ).rejects.toThrow("50 MB");
    expect(api.post).not.toHaveBeenCalled();
  });
});

it("requests a new grant after completion authorization expires", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetch);
  vi.mocked(api.post)
    .mockResolvedValueOnce({
      uploadUrl: "https://storage.example/old",
      ticket: "old",
    })
    .mockRejectedValueOnce({ statusCode: 403, message: "Expired" })
    .mockResolvedValueOnce({
      uploadUrl: "https://storage.example/new",
      ticket: "new",
    })
    .mockResolvedValueOnce({ assetId: "saved" });
  const video = file();
  await expect(directMediaUpload(video, "sermons")).rejects.toMatchObject({
    statusCode: 403,
  });
  await directMediaUpload(video, "sermons");
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenLastCalledWith("/media/upload/complete", {
    ticket: "new",
  });
});
