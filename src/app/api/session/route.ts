import { type NextRequest, NextResponse } from "next/server";
import { expireSession, readSession, trustedBrowserRequest } from "@/lib/server-session";

export async function DELETE(request: NextRequest) {
  if (!trustedBrowserRequest(request)) return new NextResponse(null, { status: 403 });
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  expireSession(response);
  return response;
}

/** A presence hint only; the backend remains responsible for verification. */
export async function GET(request: NextRequest) {
  if (!trustedBrowserRequest(request)) return new NextResponse(null, { status: 403 });
  const hasSession = !!(readSession(request).access || readSession(request).refresh);
  return NextResponse.json({ hasSession }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
