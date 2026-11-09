/** Managed files use the current web session, even when saved with an older host. */
export function mediaPlaybackUrl(value: string): string | undefined {
  try {
    const url = new URL(value, "https://belivrhq.invalid");
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    const managed = url.pathname.match(/^\/api\/(?:backend|v1)\/media\/files\/([a-zA-Z0-9_-]+)$/);
    if (managed) return `/api/backend/media/files/${managed[1]}`;
    return /^https?:\/\//i.test(value) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function videoEmbedUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    const host = url.hostname.replace(/^www\./, "");
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.slice(1)
        : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];
      if (id && /^[a-zA-Z0-9_-]+$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (["vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch { /* Invalid links have no embedded player. */ }
  return undefined;
}
