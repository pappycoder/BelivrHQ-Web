import "server-only";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store, private" };
  try {
    const backend = new URL(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "");
    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "");
    if (backend.protocol !== "https:" || site.protocol !== "https:" || backend.username || backend.password || site.username || site.password)
      throw new Error("Invalid release origins");
    const response = await fetch(new URL("/api/v1/health", backend), {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    if (!response.ok || body?.success !== true || body.data?.status !== "healthy") throw new Error("Backend unavailable");
    return NextResponse.json({ success: true, data: { status: "healthy", service: "web", backendOrigin: backend.origin, siteOrigin: site.origin } }, { headers });
  } catch {
    return NextResponse.json({ success: false, data: { status: "unhealthy", service: "web" } }, { status: 503, headers });
  }
}
