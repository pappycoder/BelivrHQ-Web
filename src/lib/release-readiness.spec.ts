import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GET } from "../app/api/health/ready/route";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function configure() {
  vi.stubEnv("API_URL", "https://staging-api.belivrhq.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.belivrhq.com");
}
it("checks the configured backend without caching or following redirects", async () => {
  configure();
  const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true, data: { status: "healthy" } }));
  vi.stubGlobal("fetch", fetcher);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect((await response.json()).data.backendOrigin).toBe("https://staging-api.belivrhq.com");
  expect(String(fetcher.mock.calls[0][0])).toBe("https://staging-api.belivrhq.com/api/v1/health");
  expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error" });
});
it.each(["outage", "timeout", "invalid-json", "false-success"])("fails closed for %s", async (failure) => {
  configure();
  vi.stubGlobal("fetch", vi.fn(async () => {
    if (failure === "timeout") throw new Error("private-credential");
    if (failure === "invalid-json") return new Response("private-credential");
    return Response.json({ success: failure !== "false-success", data: { status: failure === "outage" ? "unhealthy" : "healthy" } }, { status: failure === "outage" ? 503 : 200 });
  }));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private-credential");
});
it.each(["", "http://backend.example", "https://user:password@backend.example"])("rejects a missing or unsafe origin", async (origin) => {
  configure();vi.stubEnv("API_URL", origin);vi.stubEnv("NEXT_PUBLIC_API_URL", "");
  const fetcher=vi.fn();vi.stubGlobal("fetch", fetcher);
  expect((await GET()).status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
