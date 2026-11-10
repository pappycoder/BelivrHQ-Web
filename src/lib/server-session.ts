import { LEGACY_BRAND } from "./brand/identity";
import "server-only";
import { type NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIES = {
  access: "belivrhq_token",
  refresh: "belivrhq_refresh_token",
};
export function readSession(request: Pick<NextRequest, "cookies">) {
  const modern = Object.values(SESSION_COOKIES).some(
    (name) => request.cookies.get(name) !== undefined,
  );
  const names = modern ? SESSION_COOKIES : LEGACY_BRAND.cookies;
  return {
    access: request.cookies.get(names.access)?.value,
    refresh: request.cookies.get(names.refresh)?.value,
  };
}
export const BACKEND_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

// Next normalizes loopback request URLs to localhost. A browser using
// 127.0.0.1 or [::1] still sends that exact address as its Origin and Host.
// Accept only that matching loopback authority, protocol and port; public
// origins and all other client/cross-site checks keep their existing rules.
function matchesBrowserOrigin(request: NextRequest, origin: string) {
  if (origin === request.nextUrl.origin) return true;
  if (request.nextUrl.hostname !== "localhost") return false;
  try {
    const parsed = new URL(origin);
    return (
      origin === parsed.origin &&
      ["127.0.0.1", "[::1]"].includes(parsed.hostname) &&
      parsed.host === request.headers.get("host") &&
      parsed.protocol === request.nextUrl.protocol &&
      parsed.port === request.nextUrl.port
    );
  } catch {
    return false;
  }
}

export function trustedBrowserRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const browserRead =
    request.method === "GET" &&
    request.headers.get("sec-fetch-site") === "same-origin" &&
    ["image", "audio", "video", "document", "empty"].includes(
      request.headers.get("sec-fetch-dest") ?? "",
    );
  return (
    ((request.headers.get("x-belivrhq-client") ??
      request.headers.get(LEGACY_BRAND.clientHeader)) === "web" ||
      browserRead) &&
    request.headers.get("sec-fetch-site") !== "cross-site" &&
    (!origin || matchesBrowserOrigin(request, origin))
  );
}

export function saveSession(
  response: NextResponse,
  data: Record<string, unknown>,
) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  // Retain an expired access token server-side so a valid refresh can recover it.
  if (typeof data.accessToken === "string")
    for (const names of [SESSION_COOKIES, LEGACY_BRAND.cookies])
      response.cookies.set(names.access, data.accessToken, {
        ...options,
        maxAge: 30 * 86400,
      });
  if (typeof data.refreshToken === "string")
    for (const names of [SESSION_COOKIES, LEGACY_BRAND.cookies])
      response.cookies.set(names.refresh, data.refreshToken, {
        ...options,
        maxAge: 30 * 86400,
      });
}

export function expireSession(response: NextResponse) {
  for (const name of [
    ...Object.values(SESSION_COOKIES),
    ...Object.values(LEGACY_BRAND.cookies),
  ]) {
    response.cookies.set(name, "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });
  }
}
