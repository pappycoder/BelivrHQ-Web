import { LEGAL_LINKS } from "./legal/company";
import { afterEach, describe, expect, it, vi } from "vitest";
import { access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { absoluteUrl, getSiteUrl } from "./site";
import { publicPageMetadata, serializeJsonLd } from "./seo";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { helpArticles } from "./help/catalog";

afterEach(() => vi.unstubAllEnvs());
describe("SEO publication boundaries", () => {
  it("normalizes the configured production origin and resolves absolute asset URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://church.example/path/?source=test");
    expect(getSiteUrl()).toBe("https://church.example");
    expect(absoluteUrl("/og.png")).toBe("https://church.example/og.png");
  });
  it("uses the production deployment rather than a preview deployment or localhost fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "church.example");
    vi.stubEnv("VERCEL_URL", "preview.example");
    expect(getSiteUrl()).toBe("https://church.example");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(getSiteUrl()).toBe("https://church-os-web.vercel.app");
  });
  it("rejects non-web protocols and credentials", () => {
    for (const value of ["javascript:bad", "https://user:password@example.com"]) {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
      expect(getSiteUrl).toThrow();
    }
  });
  it("gives a guide its own canonical, image and Twitter content", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://church.example");
    vi.stubEnv("VERCEL_ENV", "production");
    const meta = publicPageMetadata({ title: "Record attendance", description: "A guide", path: "/help/attendance", image: "/og/help/attendance.png", article: true });
    expect(meta.alternates?.canonical).toBe("https://church.example/help/attendance");
    expect(meta.openGraph).toMatchObject({ url: "https://church.example/help/attendance", type: "article", images: [{ url: "https://church.example/og/help/attendance.png" }] });
    expect(meta.twitter).toMatchObject({ title: "Record attendance | BelivrHQ", images: [{ url: "https://church.example/og/help/attendance.png" }] });
  });
  it("keeps preview deployments out of search and omits their sitemap entries", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(publicPageMetadata({ title: "Test", description: "Test", path: "/" }).robots).toMatchObject({ index: false });
    expect(sitemap()).toEqual([]);
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });
  it("lists only the landing page, legal pages and published guides in the sitemap", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const entries = sitemap();
    expect(entries).toHaveLength(helpArticles.length + 2 + LEGAL_LINKS.length);
    expect(new Set(entries.map(entry => entry.url)).size).toBe(entries.length);
    expect(entries.every(entry => new URL(entry.url).pathname === "/" || new URL(entry.url).pathname === "/help" || LEGAL_LINKS.some(link => link.href === new URL(entry.url).pathname) || helpArticles.some(article => `/help/${article.slug}` === new URL(entry.url).pathname))).toBe(true);
    expect(entries.find(entry => new URL(entry.url).pathname === "/")?.lastModified).toBeUndefined();
  });
  it("escapes HTML boundaries in structured data without corrupting JSON values", () => {
    const data = { headline: "</script><script>alert(1)</script>" };
    expect(serializeJsonLd(data)).not.toContain("<");
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
  it("ships an actual 1200×630 PNG for every public social card", async () => {
    const images = ["og.png", "og/help.png", ...helpArticles.map(article => `og/help/${article.slug}.png`)];
    for (const image of images) {
      const filename = path.join(process.cwd(), "public", image);
      await access(filename);
      const info = await sharp(filename).metadata();
      expect([info.format, info.width, info.height], image).toEqual(["png", 1200, 630]);
    }
  });
});
