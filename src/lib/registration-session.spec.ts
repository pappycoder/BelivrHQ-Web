import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { POST } from "../app/api/backend/[...path]/route";

afterEach(() => vi.unstubAllGlobals());
describe("registration cookie session", () => {
  it("stores signup tokens in HttpOnly cookies and strips them from browser JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({
      success: true,
      data: { userId: "new-admin", churchId: "church", accessToken: "private-access", refreshToken: "private-refresh", expiresAt: 1900000000 },
    }, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const req = new NextRequest("http://localhost/api/backend/auth/register", {
      method: "POST", headers: { "x-belivrhq-client": "web", "Content-Type": "application/json", cookie: "belivrhq_token=old-account" },
      body: JSON.stringify({ email: "admin@example.org", password: "private-password" }),
    });
    const response = await POST(req, { params: Promise.resolve({ path: ["auth", "register"] }) });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data).toMatchObject({ userId: "new-admin", churchId: "church", sessionEstablished: true });
    expect(JSON.stringify(body)).not.toContain("private-");
    expect(response.cookies.get("belivrhq_token")?.value).toBe("private-access");
    expect(response.cookies.get("belivrhq_refresh_token")?.value).toBe("private-refresh");
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fetch.mock.calls[0][1].headers.has("authorization")).toBe(false);
  });
});
