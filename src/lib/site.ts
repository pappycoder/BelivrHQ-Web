import { BRAND_NAME } from "./brand/identity";
export const SITE_NAME = BRAND_NAME;
export const SITE_DESCRIPTION =
  "Bring your church’s people, attendance, giving and branches together. BelivrHQ makes room for more ministry, with plans from $10 USD per month.";
export const SITE_TITLE = "BelivrHQ: A little less admin. A lot more ministry.";
export const BRAND_COLOR = "#183b40";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = new URL(configured || (production ? `https://${production}` : "https://church-os-web.vercel.app"));
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) public origin.");
  return url.origin;
}

export function absoluteUrl(path: string): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
