import { isAnonymousPublicFormRequest } from "@/lib/anonymous-api";
import { type NextRequest, NextResponse } from "next/server";
import {
  BACKEND_URL,
  SESSION_COOKIES,
  expireSession,
  saveSession,
  trustedBrowserRequest,
} from "@/lib/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
const sessionEndpoints = new Set(["auth/register", "auth/login", "auth/login/2fa", "auth/refresh"]);

async function proxy(request: NextRequest, context: Context) {
  if (!trustedBrowserRequest(request)) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid request origin" } },
      { status: 403 },
    );
  }
  const { path } = await context.params;
  if (!path.length || path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid API path" } },
      { status: 400 },
    );
  }
  const endpoint = path.join("/");
  const headers = new Headers();
  if (process.env.INTERNAL_PROXY_SECRET) {
    headers.set("x-churchos-proxy-secret", process.env.INTERNAL_PROXY_SECRET);
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
    if (ip) headers.set("x-churchos-client-ip", ip);
  }
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const token = request.cookies.get(SESSION_COOKIES.access)?.value;
  // Authentication endpoints must not inherit a different signed-in account.
  if (
    token &&
    !sessionEndpoints.has(endpoint) &&
    endpoint !== "auth/accept-invitation" &&
    !isAnonymousPublicFormRequest(endpoint, request.method) &&
    endpoint !== "bot-protection/challenge"
  )
    headers.set("authorization", `Bearer ${token}`);
  const range = request.headers.get("range");
  if (range) headers.set("range", range);
  const requestId = request.headers.get("x-request-id");
  if (requestId && /^[a-zA-Z0-9_-]{1,80}$/.test(requestId)) headers.set("x-request-id", requestId);
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 55 * 1024 * 1024) return new NextResponse(null, { status: 413 });
  let body: BodyInit | undefined;
  if (endpoint === "auth/refresh") {
    const refreshToken = request.cookies.get(SESSION_COOKIES.refresh)?.value;
    if (!refreshToken)
      return NextResponse.json(
        { success: false, error: { message: "Session expired" } },
        { status: 401 },
      );
    headers.set("content-type", "application/json");
    body = JSON.stringify({ refreshToken });
  } else if (hasBody) {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 55 * 1024 * 1024) {
          await reader.cancel();
          return new NextResponse(null, { status: 413 });
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = bytes;
  }
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/${endpoint}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(60000)]),
    });
    const responseHeaders = new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of [
      "content-type",
      "content-disposition",
      "content-range",
      "accept-ranges",
      "server-timing",
      "retry-after",
      "x-request-id",
      "x-ratelimit-limit",
      "x-ratelimit-remaining",
      "x-ratelimit-reset",
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    let session: Record<string, unknown> | undefined;
    let response: NextResponse;
    if (
      sessionEndpoints.has(endpoint) &&
      upstream.headers.get("content-type")?.includes("application/json")
    ) {
      const json = await upstream.json();
      responseHeaders.delete("content-length");
      if (json.success && typeof json.data?.accessToken === "string") {
        session = { ...json.data };
        delete json.data.accessToken;
        delete json.data.refreshToken;
        json.data.sessionEstablished = true;
      }
      response = NextResponse.json(json, { status: upstream.status, headers: responseHeaders });
    } else {
      response = new NextResponse(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }
    if (session) {
      responseHeaders.delete("content-length");
      response.headers.delete("content-length");
      saveSession(response, session);
    }
    if (endpoint === "auth/logout" && request.method === "POST") expireSession(response);
    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Service temporarily unavailable. Please try again.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
