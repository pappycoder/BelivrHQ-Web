import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ get: vi.fn(), refresh: vi.fn(), clear: vi.fn(), advance: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get: auth.get }, refreshSession: auth.refresh, advanceSessionGeneration: auth.advance }));
vi.mock("@/lib/session", () => ({ clearTokens: auth.clear }));
import { retryPage } from "./retry-page";
const reload = vi.fn();
const replace = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("window", { location: { pathname: "/operations/assets", reload, replace } });
  auth.get.mockResolvedValue({ userId: "test-user" });
  auth.clear.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
describe("page retry", () => {
  it("verifies the session and fully reloads the current page", async () => {
    await retryPage();
    expect(auth.get).toHaveBeenCalledWith("/auth/session", { skipAuth: true });
    expect(reload).toHaveBeenCalledOnce();
    expect(auth.clear).not.toHaveBeenCalled();
  });
  it("clears an unrecoverable session before sending the user to login", async () => {
    auth.get.mockRejectedValue({ statusCode: 401 }); auth.refresh.mockResolvedValue(null);
    await retryPage();
    expect(auth.advance).toHaveBeenCalledOnce(); expect(auth.clear).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/login"); expect(reload).not.toHaveBeenCalled();
    expect(auth.clear.mock.invocationCallOrder[0]).toBeLessThan(replace.mock.invocationCallOrder[0]);
  });
  it("recovers an expired access token when the refresh session is still valid", async () => {
    auth.get.mockRejectedValueOnce({ statusCode: 401 }).mockResolvedValueOnce({ userId: "test-user" });
    auth.refresh.mockResolvedValue({ sessionEstablished: true });
    await retryPage();
    expect(auth.get).toHaveBeenCalledTimes(2); expect(reload).toHaveBeenCalledOnce();
    expect(auth.clear).not.toHaveBeenCalled();
  });
  it("logs out if verification still fails after refreshing", async () => {
    auth.get.mockRejectedValue({ statusCode: 401 }); auth.refresh.mockResolvedValue({ sessionEstablished: true });
    await retryPage(); expect(replace).toHaveBeenCalledWith("/login"); expect(auth.clear).toHaveBeenCalledOnce();
  });
  it.each([0, 403, 503])("does not mistake status %s for session expiry", async (statusCode) => {
    auth.get.mockRejectedValue({ statusCode }); await retryPage();
    expect(auth.clear).not.toHaveBeenCalled(); expect(reload).toHaveBeenCalledOnce();
  });
  it("keeps the session when refresh is temporarily unavailable", async () => {
    auth.get.mockRejectedValue({ statusCode: 401 }); auth.refresh.mockRejectedValue({ statusCode: 503 });
    await retryPage(); expect(auth.clear).not.toHaveBeenCalled(); expect(reload).toHaveBeenCalledOnce();
  });
  it("reloads public forms without requiring a login", async () => {
    window.location.pathname = "/forms/public/example"; await retryPage();
    expect(auth.get).not.toHaveBeenCalled(); expect(reload).toHaveBeenCalledOnce();
  });
  it("still leaves the protected page if cookie cleanup fails", async () => {
    auth.get.mockRejectedValue({ statusCode: 401 }); auth.refresh.mockResolvedValue(null); auth.clear.mockRejectedValue(new Error("Offline"));
    await retryPage(); expect(replace).toHaveBeenCalledWith("/login");
  });
});
