import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { trustedBrowserRequest } from "./server-session";
import { POST } from "../app/api/backend/[...path]/route";

function request(
  origin: string,
  host = "127.0.0.1:3000",
  overrides: Record<string, string> = {},
  url = "http://localhost:3000/api/backend/auth/register",
) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      origin,
      host,
      "x-belivrhq-client": "web",
      "sec-fetch-site": "same-origin",
      ...overrides,
    },
  });
}
describe("same-origin requests on local loopback addresses", () => {
  it.each(["127.0.0.1", "[::1]"])(
    "accepts the actual matching %s browser authority despite Next URL normalization",
    (hostname) => {
      expect(
        trustedBrowserRequest(
          request(`http://${hostname}:3000`, `${hostname}:3000`),
        ),
      ).toBe(true);
    },
  );
  it("continues accepting localhost", () => {
    expect(
      trustedBrowserRequest(request("http://localhost:3000", "localhost:3000")),
    ).toBe(true);
  });
  it.each([
    ["http://127.0.0.1:3002", "127.0.0.1:3000"],
    ["http://127.0.0.1:3000", "localhost:3000"],
    ["https://127.0.0.1:3000", "127.0.0.1:3000"],
    ["http://127.0.0.1:3000/path", "127.0.0.1:3000"],
    ["https://attacker.example", "127.0.0.1:3000"],
    ["null", "127.0.0.1:3000"],
  ])("rejects a different or invalid origin %s", (origin, host) => {
    expect(trustedBrowserRequest(request(origin, host))).toBe(false);
  });
  it("retains the cross-site and client-header protections", () => {
    expect(
      trustedBrowserRequest(
        request("http://127.0.0.1:3000", undefined, {
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
    expect(
      trustedBrowserRequest(
        request("http://127.0.0.1:3000", undefined, {
          "x-belivrhq-client": "",
        }),
      ),
    ).toBe(false);
  });
  it("never treats loopback as an alias for a deployed public origin", () => {
    expect(
      trustedBrowserRequest(
        request(
          "http://127.0.0.1:3000",
          "127.0.0.1:3000",
          {},
          "https://belivrhq.example/api/backend/auth/register",
        ),
      ),
    ).toBe(false);
    expect(
      trustedBrowserRequest(
        request(
          "https://belivrhq.example",
          "belivrhq.example",
          {},
          "https://belivrhq.example/api/backend/auth/register",
        ),
      ),
    ).toBe(true);
  });
  it("forwards a loopback registration request to backend validation instead of rejecting it with 403", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { success: false, error: { message: "Validation failed" } },
          { status: 400 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    try {
      const response = await POST(request("http://127.0.0.1:3000"), {
        params: Promise.resolve({ path: ["auth", "register"] }),
      });
      expect(response.status).toBe(400);
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
