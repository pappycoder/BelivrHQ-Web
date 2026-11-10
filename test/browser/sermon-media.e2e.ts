import { test, expect, type BrowserContext } from "@playwright/test";

function recording() {
  const bytes = Buffer.alloc(44 + 160000);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(160000, 40);
  return bytes;
}

async function fixture(
  context: BrowserContext,
  editing = false,
  options: {
    withRecordings?: boolean;
    isHq?: boolean;
    failVideoOnce?: boolean;
    failSaveOnce?: boolean;
  } = {},
) {
  const audio = {
    assetId: "audio-a",
    filename: "Sunday Message.wav",
    url: "http://localhost:3000/api/backend/media/files/audio-a",
    mimeType: "audio/wav",
    sizeBytes: 160044,
    folder: "sermons",
    permissions: "members",
    createdAt: "2026-10-25T09:00:00Z",
  };
  const video = {
    ...audio,
    assetId: "video-a",
    filename: "Sunday Message.mp4",
    url: "https://old-api.example/api/v1/media/files/video-a",
    mimeType: "video/mp4",
  };
  const withRecordings = options.withRecordings ?? !editing;
  const assets = withRecordings ? [audio, video] : [];
  let failedVideo = false,
    failedSave = false;
  const sermon = {
    sermonId: "sermon-a",
    churchId: "church-a",
    branchId: "branch-a",
    branchName: "Main Branch",
    title: "Sunday Message",
    tags: [],
    sermonDate: "2026-10-25T09:00:00Z",
    createdAt: "2026-10-25T09:00:00Z",
    updatedAt: "2026-10-25T09:00:00Z",
    audioUrl: withRecordings ? audio.url : undefined,
    videoUrl: withRecordings ? video.url : undefined,
  };
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const uploads: Record<string, unknown>[] = [];
  const grants = new Map<string, Record<string, unknown>>();
  const transferBytes: number[] = [];
  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "recording-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("https://storage.example/**", async (route) => {
    const headers = {
      "Access-Control-Allow-Origin": "http://127.0.0.1:3107",
      "Access-Control-Allow-Methods": "PUT,OPTIONS",
      "Access-Control-Allow-Headers": "content-type,x-upsert",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    const key = new URL(route.request().url()).pathname.slice(1);
    const metadata = grants.get(key)!;
    uploads.push(metadata);
    transferBytes.push(route.request().postDataBuffer()?.length ?? 0);
    await uploadGate;
    if (
      metadata.contentType === "video/mp4" &&
      options.failVideoOnce &&
      !failedVideo
    ) {
      failedVideo = true;
      return route.fulfill({
        status: 503,
        headers,
        body: "Upload unavailable",
      });
    }
    return route.fulfill({ status: 200, headers, json: { Key: key } });
  });
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.includes("/media/files/")) {
      const bytes = path.endsWith("audio-a")
        ? recording()
        : Buffer.from("unplayable-video");
      const range = request.headers().range;
      const start = Number(range?.match(/^bytes=(\d+)-/)?.[1] ?? 0);
      return route.fulfill({
        status: range ? 206 : 200,
        body: bytes.subarray(start),
        headers: {
          "Content-Type": path.endsWith("audio-a") ? "audio/wav" : "video/mp4",
          "Accept-Ranges": "bytes",
          ...(range
            ? {
                "Content-Range": `bytes ${start}-${bytes.length - 1}/${bytes.length}`,
              }
            : {}),
        },
      });
    }
    let data: unknown = [];
    if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        firstName: "Media",
        lastName: "Viewer",
        role: ["media_team"],
        status: "active",
        isAdminHq: options.isHq ?? false,
        planFeatures: ["media"],
        permissions: [
          "sermons:list:read",
          "media:library:read",
          "media:folders:read",
          ...(editing ? ["sermons:update", "sermons:new:create"] : []),
        ],
      };
    else if (path.endsWith("/branches"))
      data = {
        data: [
          { branchId: "branch-a", name: "Main Branch" },
          { branchId: "branch-b", name: "East Branch" },
        ],
        total: 2,
      };
    else if (path.endsWith("/sermons/sermon-a")) {
      if (request.method() === "PATCH") {
        const body = request.postDataJSON();
        writes.push({ path, body });
        if (options.failSaveOnce && !failedSave) {
          failedSave = true;
          return route.fulfill({
            status: 503,
            json: {
              success: false,
              error: { message: "Sermon save temporarily failed" },
            },
          });
        }
        Object.assign(sermon, body);
      }
      data = sermon;
    } else if (path.endsWith("/sermons")) {
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        writes.push({ path, body });
        Object.assign(sermon, body);
        data = sermon;
      } else data = { data: [sermon], total: 1 };
    } else if (path.endsWith("/media/library/folders"))
      data = assets.length ? [{ folder: "sermons", count: assets.length }] : [];
    else if (path.endsWith("/media/library"))
      data = { data: assets, total: assets.length };
    else if (path.endsWith("/media/upload/prepare")) {
      const metadata = request.postDataJSON();
      const key = `grant-${grants.size + 1}`;
      grants.set(key, metadata);
      data = { ticket: key, uploadUrl: `https://storage.example/${key}` };
    } else if (path.endsWith("/media/upload/complete")) {
      const metadata = grants.get(request.postDataJSON().ticket)!;
      const asset = metadata.contentType === "video/mp4" ? video : audio;
      assets.push(asset);
      data = {
        assetId: asset.assetId,
        url: asset.url,
        path: `sermons/church-a/${asset.assetId}`,
        size: metadata.size,
        contentType: metadata.contentType,
      };
    } else if (path.endsWith("/unread-count")) data = { count: 0 };
    else if (path.endsWith("/notifications") || path.endsWith("/auth/sessions"))
      data = { data: [], total: 0 };
    else if (path.endsWith("/bookmark")) data = { bookmarked: false };
    return route.fulfill({ json: { success: true, data } });
  });
  return { writes, uploads, releaseUpload, transferBytes };
}

test("sermon readers can play uploaded audio and open both recordings with their current session", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/sermons/sermon-a");
  await expect(
    page.getByRole("heading", { name: "Audio Recording", exact: true }),
  ).toBeVisible();
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("controls", "");
  await expect(audio).toHaveAttribute(
    "src",
    "/api/backend/media/files/audio-a",
  );
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.duration))
    .toBe(10);
  await expect(
    page.getByRole("link", { name: "Open audio recording", exact: true }),
  ).toHaveAttribute("href", "/api/backend/media/files/audio-a");
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    "/api/backend/media/files/video-a",
  );
  await expect(
    page.getByRole("link", { name: "Open video recording", exact: true }),
  ).toHaveAttribute("href", "/api/backend/media/files/video-a");
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
});

test("media library readers can preview audio and video and open the original without edit access", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/media?folder=sermons");
  await page.getByRole("button", { name: "Play Audio", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect
    .poll(() =>
      dialog
        .locator("audio")
        .evaluate((element: HTMLAudioElement) => element.duration),
    )
    .toBe(10);
  await expect(
    dialog.getByRole("link", { name: "Open Original", exact: true }),
  ).toHaveAttribute("href", "/api/backend/media/files/audio-a");
  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Watch Video", exact: true }).click();
  await expect(dialog.locator("video")).toHaveAttribute("controls", "");
  await expect(
    dialog.getByRole("link", { name: "Open Original", exact: true }),
  ).toHaveAttribute("href", "/api/backend/media/files/video-a");
  await expect(
    dialog.getByText("This recording could not play here.", { exact: false }),
  ).toBeVisible();
});

test("section saves isolate details and both files while preserving unsaved drafts", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true);
  await page.goto("/sermons/sermon-a/edit");
  await page.getByLabel("Title", { exact: true }).fill("Updated Message");
  await page.getByRole("tab", { name: "2. Audio", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles({
    name: "Sunday Message.wav",
    mimeType: "audio/wav",
    buffer: recording(),
  });
  await page.getByRole("tab", { name: "3. Video", exact: true }).click();
  await page.getByLabel("Video file", { exact: true }).setInputFiles({
    name: "Sunday Message.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.alloc(5 * 1024 * 1024),
  });
  await page.getByRole("tab", { name: "1. Details", exact: true }).click();
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.uploads).toHaveLength(0);
  expect(state.writes[0].body.title).toBe("Updated Message");
  expect(state.writes[0].body).not.toHaveProperty("audioUrl");
  expect(state.writes[0].body).not.toHaveProperty("videoUrl");
  await expect(
    page.getByRole("button", { name: "Save Details", exact: true }),
  ).toBeEnabled();
  // Invalid, unsaved details must not block a recording save.
  await page.getByLabel("Title", { exact: true }).fill("");
  await page.getByRole("tab", { name: "2. Audio", exact: true }).click();
  await expect(
    page.getByText("Sunday Message.wav", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save Audio", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Uploading audio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saving…", exact: true }),
  ).toBeDisabled();
  state.releaseUpload();
  await expect(
    page.getByRole("button", { name: "Save Audio", exact: true }),
  ).toBeEnabled();
  expect(state.writes[1].body).toEqual({
    audioUrl: "http://localhost:3000/api/backend/media/files/audio-a",
  });
  expect(state.uploads).toHaveLength(1);
  await page.getByRole("tab", { name: "3. Video", exact: true }).click();
  await expect(
    page.getByText("Sunday Message.mp4", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save Video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Video", exact: true }),
  ).toBeEnabled();
  expect(state.writes[2].body).toEqual({
    videoUrl: "https://old-api.example/api/v1/media/files/video-a",
  });
  expect(Math.max(...state.transferBytes)).toBe(5 * 1024 * 1024);
  for (const body of state.uploads)
    expect(body).toMatchObject({ branchId: "branch-a", folder: "sermons" });
  await page.getByRole("tab", { name: "1. Details", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Updated Message",
  );
  await page.goto("/sermons/sermon-a");
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    "/api/backend/media/files/audio-a",
  );
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    "/api/backend/media/files/video-a",
  );
});

test("pasted links validate and save or remove only their own recording", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true, { withRecordings: true });
  await page.goto("/sermons/sermon-a/edit");
  await page.getByRole("tab", { name: "2. Audio", exact: true }).click();
  await page.getByRole("button", { name: "Paste Link", exact: true }).click();
  await page
    .getByLabel("Audio link", { exact: true })
    .fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save Audio", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Enter a valid http or https recording link." }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(0);
  await page
    .getByLabel("Audio link", { exact: true })
    .fill("https://podcasts.example/message.mp3");
  await page.getByRole("button", { name: "Save Audio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Audio", exact: true }),
  ).toBeEnabled();
  expect(state.writes[0].body).toEqual({
    audioUrl: "https://podcasts.example/message.mp3",
  });
  await page.getByRole("button", { name: "Choose File", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove audio recording", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Audio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Audio", exact: true }),
  ).toBeEnabled();
  expect(state.writes[1].body).toEqual({ audioUrl: null });
  await page.getByRole("tab", { name: "3. Video", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove video recording", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Video", exact: true }),
  ).toBeEnabled();
  expect(state.writes[2].body).toEqual({ videoUrl: null });
  expect(state.uploads).toHaveLength(0);
});

for (const failure of ["upload", "save"] as const) {
  test(`video ${failure} failure preserves saved details and audio and supports retry`, async ({
    page,
    context,
  }) => {
    const state = await fixture(context, true, {
      withRecordings: true,
      failVideoOnce: failure === "upload",
      failSaveOnce: failure === "save",
    });
    state.releaseUpload();
    await page.goto("/sermons/sermon-a/edit");
    await page.getByRole("tab", { name: "3. Video", exact: true }).click();
    await page.getByLabel("Video file", { exact: true }).setInputFiles({
      name: "Sunday Message.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("video"),
    });
    await page.getByRole("button", { name: "Save Video", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({
        hasText:
          failure === "upload"
            ? "Storage upload failed (503)"
            : "Service temporarily unavailable. Please try again later.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Video", exact: true }),
    ).toBeEnabled();
    await page.getByRole("tab", { name: "1. Details", exact: true }).click();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Sunday Message",
    );
    await page.getByRole("tab", { name: "2. Audio", exact: true }).click();
    await expect(
      page.getByText("http://localhost:3000/api/backend/media/files/audio-a", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "3. Video", exact: true }).click();
    await page.getByRole("button", { name: "Save Video", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Save Video", exact: true }),
    ).toBeEnabled();
    expect(state.uploads).toHaveLength(failure === "upload" ? 2 : 1);
    for (const write of state.writes)
      expect(write.body).toEqual({
        videoUrl: "https://old-api.example/api/v1/media/files/video-a",
      });
    await page.reload();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Sunday Message",
    );
    await page.getByRole("tab", { name: "2. Audio", exact: true }).click();
    await expect(
      page.getByText("http://localhost:3000/api/backend/media/files/audio-a", {
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("new sermons save details before independent recording updates to the same sermon", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true);
  state.releaseUpload();
  await page.goto("/sermons/new");
  await expect(
    page.getByRole("tab", { name: "2. Audio", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Title", { exact: true }).fill("New Message");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-25");
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect(page).toHaveURL(/\/sermons\/sermon-a\/edit$/);
  expect(state.uploads).toHaveLength(0);
  expect(state.writes[0]).toMatchObject({
    path: "/api/backend/sermons",
    body: { title: "New Message", branchId: "branch-a" },
  });
  expect(state.writes[0].body).not.toHaveProperty("audioUrl");
  await page.getByRole("tab", { name: "2. Audio", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles({
    name: "Sunday Message.wav",
    mimeType: "audio/wav",
    buffer: recording(),
  });
  await page.getByRole("button", { name: "Save Audio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Audio", exact: true }),
  ).toBeEnabled();
  expect(state.writes[1].path).toBe("/api/backend/sermons/sermon-a");
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "New Message",
  );
});

test("details save failures retain drafts without changing either recording", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true, {
    withRecordings: true,
    failSaveOnce: true,
  });
  await page.goto("/sermons/sermon-a/edit");
  await page.getByLabel("Title", { exact: true }).fill("Details Updated");
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect(
    page.getByText("Details could not be saved", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Details Updated",
  );
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Details", exact: true }),
  ).toBeEnabled();
  expect(state.uploads).toHaveLength(0);
  expect(state.writes).toHaveLength(2);
  for (const write of state.writes) {
    expect(write.body.title).toBe("Details Updated");
    expect(write.body).not.toHaveProperty("audioUrl");
    expect(write.body).not.toHaveProperty("videoUrl");
  }
});

test("media uses the saved branch and preserves an unsaved HQ branch selection", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true, { isHq: true });
  state.releaseUpload();
  await page.goto("/sermons/sermon-a/edit");
  await page.getByLabel("Branch", { exact: true }).click();
  await page.getByRole("option", { name: "East Branch", exact: true }).click();
  await page.getByRole("tab", { name: "2. Audio", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles({
    name: "Sunday Message.wav",
    mimeType: "audio/wav",
    buffer: recording(),
  });
  await page.getByRole("button", { name: "Save Audio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Audio", exact: true }),
  ).toBeEnabled();
  expect(state.uploads[0]).toMatchObject({ branchId: "branch-a" });
  await page.getByRole("tab", { name: "1. Details", exact: true }).click();
  await expect(page.getByLabel("Branch", { exact: true })).toContainText(
    "East Branch",
  );
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Details", exact: true }),
  ).toBeEnabled();
  expect(state.writes[1].body.branchId).toBe("branch-b");
  await page.getByRole("tab", { name: "3. Video", exact: true }).click();
  await page.getByLabel("Video file", { exact: true }).setInputFiles({
    name: "Sunday Message.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("video"),
  });
  await page.getByRole("button", { name: "Save Video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Video", exact: true }),
  ).toBeEnabled();
  expect(state.uploads[1]).toMatchObject({ branchId: "branch-b" });
});

test("a 1.9 MB video uploads directly to storage and saves its recording URL", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true);
  state.releaseUpload();
  await page.goto("/sermons/sermon-a/edit");
  await page.getByRole("tab", { name: "3. Video", exact: true }).click();
  await page
    .getByLabel("Video file", { exact: true })
    .setInputFiles({
      name: "Sunday Message.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.alloc(1_900_000),
    });
  await page.getByRole("button", { name: "Save Video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save Video", exact: true }),
  ).toBeEnabled();
  expect(state.transferBytes).toEqual([1_900_000]);
  expect(state.uploads[0]).toMatchObject({
    size: 1_900_000,
    folder: "sermons",
    contentType: "video/mp4",
  });
  expect(state.writes[0].body).toEqual({
    videoUrl: "https://old-api.example/api/v1/media/files/video-a",
  });
});
