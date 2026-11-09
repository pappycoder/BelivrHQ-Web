import { type NextRequest, NextResponse } from "next/server";

function getTokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get("churchos_token");
  return cookie?.value || null;
}

export function middleware(request: NextRequest) {
  // Keep bookmarked dashboard URLs on the current workspace entry point.
  if (request.nextUrl.pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  const token = getTokenFromRequest(request);
  // Presence is only a routing hint. The backend verifies the actual session.
  const authenticated = !!token || !!request.cookies.get("churchos_refresh_token")?.value;
  const { pathname } = request.nextUrl;

  const protectedPaths = [
    // Paper (Abide IA) routes — the workspace.
    "/home",
    "/people",
    "/gatherings",
    "/connect",
    "/library",
    "/insights",
    "/operations",
    "/settings",
    "/search",
    "/giving",
    "/admin",
    "/support",
    "/notifications",
    "/departments",
    "/visitors",
  ];

  const alwaysPublicPaths = ["/forms/public"];

  const isAlwaysPublic = alwaysPublicPaths.some((path) => (pathname === path || pathname.startsWith(`${path}/`)));
  const isProtected = !isAlwaysPublic && protectedPaths.some((path) => (pathname === path || pathname.startsWith(`${path}/`)));

  if (isProtected && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
