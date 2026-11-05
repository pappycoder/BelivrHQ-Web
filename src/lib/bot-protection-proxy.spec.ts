import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { GET, POST } from "../app/api/backend/[...path]/route";

afterEach(() => vi.unstubAllGlobals());
describe("bot protection proxy boundary", () => {
  it.each(["challenge", "authenticated-challenge"])(
    "forwards uncached %s responses with the correct credential boundary",
    async (endpoint) => {
      const upstream = {
        parameters: { algorithm: "SHA-256" },
        signature: "test-signature",
      };
      const fetch = vi
        .fn()
        .mockResolvedValue(
          Response.json(upstream, { headers: { "Cache-Control": "no-store" } }),
        );
      vi.stubGlobal("fetch", fetch);
      const request = new NextRequest(
        `http://localhost/api/backend/bot-protection/${endpoint}?method=POST&path=%2Fauth%2Flogin`,
        {
          headers: {
            "x-churchos-client": "web",
            cookie: "churchos_token=existing-session",
          },
        },
      );
      const response = await GET(request, {
        params: Promise.resolve({ path: ["bot-protection", endpoint] }),
      });
      expect(await response.json()).toEqual(upstream);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(fetch.mock.calls[0][1].headers.get("authorization")).toBe(
        endpoint === "challenge" ? null : "Bearer existing-session",
      );
    },
  );

  it("forwards proof and honeypot fields without changing public-form data", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ success: true, data: {} }));
    vi.stubGlobal("fetch", fetch);
    const body = {
      data: { website: "A legitimate form answer" },
      altcha: "signed-proof",
      website: "",
    };
    const request = new NextRequest(
      "http://localhost/api/backend/forms/public/token-a/submit",
      {
        method: "POST",
        headers: {
          "x-churchos-client": "web",
          "content-type": "application/json",
          cookie: "churchos_token=old-session",
        },
        body: JSON.stringify(body),
      },
    );
    await POST(request, {
      params: Promise.resolve({
        path: ["forms", "public", "token-a", "submit"],
      }),
    });
    expect(fetch.mock.calls[0][1].headers.has("authorization")).toBe(false);
    expect(
      JSON.parse(new TextDecoder().decode(fetch.mock.calls[0][1].body)),
    ).toEqual(body);
  });
});
