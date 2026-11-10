import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_BRAND } from "./brand/identity";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { GET, POST } from "../app/api/backend/[...path]/route";
afterEach(() => vi.unstubAllGlobals());
describe("Registration billing-only cookies", () => {
  it("withholds every full-session token and stores only the scoped HttpOnly credential", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            success: true,
            data: {
              userId: "new-admin",
              churchId: "church",
              registrationCheckoutToken: "private-checkout",
              accessToken: "old-upstream-token",
              refreshToken: "old-refresh",
            },
          },
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const request = new NextRequest(
      "http://localhost/api/backend/auth/register",
      {
        method: "POST",
        headers: {
          "x-belivrhq-client": "web",
          "content-type": "application/json",
          cookie: "belivrhq_token=old-account",
        },
        body: JSON.stringify({ email: "admin@example.org" }),
      },
    );
    const response = await POST(request, {
      params: Promise.resolve({ path: ["auth", "register"] }),
    });
    const body = await response.json();
    expect(body.data).not.toHaveProperty("sessionEstablished");
    expect(JSON.stringify(body)).not.toContain("private-");
    expect(JSON.stringify(body)).not.toContain("old-");
    expect(response.cookies.get("belivrhq_registration_checkout")?.value).toBe(
      "private-checkout",
    );
    expect(response.cookies.get("belivrhq_token")?.maxAge).toBe(0);
    expect(response.cookies.get(LEGACY_BRAND.cookies.access)?.maxAge).toBe(0);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(fetch.mock.calls[0][1].headers.has("authorization")).toBe(false);
  });
  it("forwards the capability only to registration billing, without a workspace bearer", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json({ success: true, data: {} })),
      );
    vi.stubGlobal("fetch", fetch);
    for (const path of [
      ["billing", "registration", "subscription"],
      ["members"],
    ]) {
      const request = new NextRequest(
        "http://localhost/api/backend/" + path.join("/"),
        {
          headers: {
            "x-belivrhq-client": "web",
            cookie:
              "belivrhq_registration_checkout=scoped; belivrhq_token=workspace",
          },
        },
      );
      await GET(request, { params: Promise.resolve({ path }) });
    }
    const scoped = fetch.mock.calls[0][1].headers,
      normal = fetch.mock.calls[1][1].headers;
    expect(scoped.get("x-belivrhq-registration-checkout")).toBe("scoped");
    expect(scoped.has("authorization")).toBe(false);
    expect(normal.has("x-belivrhq-registration-checkout")).toBe(false);
    expect(normal.get("authorization")).toBe("Bearer workspace");
  });
});
