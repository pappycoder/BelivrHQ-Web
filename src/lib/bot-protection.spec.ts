import { describe, expect, it, vi } from "vitest";
import { registerBotForm, withBotProtection } from "./bot-protection";

describe("protected submission transport", () => {
  it("attaches proofs, prevents concurrent submits, and resets after failed business requests", async () => {
    let finish!: (value: { altcha: string; website: string }) => void;
    const acquire = vi.fn(
      () =>
        new Promise<{ altcha: string; website: string }>((resolve) => {
          finish = resolve;
        }),
    );
    const reset = vi.fn();
    const unregister = registerBotForm("POST", "/auth/login", {
      acquire,
      reset,
    });
    const send = vi.fn().mockRejectedValue(new Error("Wrong password"));
    try {
      const first = withBotProtection(
        "POST",
        "/auth/login",
        { email: "test@example.test" },
        undefined,
        send,
      );
      await expect(
        withBotProtection("POST", "/auth/login", {}, undefined, send),
      ).rejects.toThrow("already being sent");
      finish({ altcha: "proof-a", website: "" });
      await expect(first).rejects.toThrow("Wrong password");
      expect(send).toHaveBeenCalledWith({
        email: "test@example.test",
        altcha: "proof-a",
        website: "",
      });
      expect(reset).toHaveBeenCalledOnce();
    } finally {
      unregister();
    }
  });

  it("cannot submit before a verification form is registered", async () => {
    const send = vi.fn();
    await expect(
      withBotProtection("POST", "/church/invite", {}, undefined, send),
    ).rejects.toThrow("still loading");
    expect(send).not.toHaveBeenCalled();
  });

  it("preserves a honeypot value for server validation and obtains new proofs for retries", async () => {
    const controller = {
      acquire: vi
        .fn()
        .mockResolvedValueOnce({ altcha: "first", website: "spam" })
        .mockResolvedValueOnce({ altcha: "second", website: "" }),
      reset: vi.fn(),
    };
    const unregister = registerBotForm("POST", "/broadcasts", controller);
    const send = vi.fn().mockResolvedValue("ok");
    try {
      await withBotProtection(
        "POST",
        "/broadcasts",
        { name: "News" },
        undefined,
        send,
      );
      await withBotProtection(
        "POST",
        "/broadcasts",
        { name: "News" },
        undefined,
        send,
      );
      expect(send.mock.calls.map((call) => call[0].altcha)).toEqual([
        "first",
        "second",
      ]);
      expect(send.mock.calls[0][0].website).toBe("spam");
      expect(controller.reset).toHaveBeenCalledTimes(2);
    } finally {
      unregister();
    }
  });

  it("does not send cancelled submissions and leaves routine API calls alone", async () => {
    const controller = {
      acquire: vi.fn().mockResolvedValue({ altcha: "proof", website: "" }),
      reset: vi.fn(),
    };
    const unregister = registerBotForm("PUT", "/auth/password", controller);
    const signal = AbortSignal.abort();
    const send = vi.fn().mockResolvedValue("ok");
    try {
      await expect(
        withBotProtection("PUT", "/auth/password", {}, signal, send),
      ).rejects.toThrow();
      expect(send).not.toHaveBeenCalled();
      expect(controller.reset).toHaveBeenCalledOnce();
      await expect(
        withBotProtection(
          "PATCH",
          "/members/a",
          { firstName: "Grace" },
          undefined,
          send,
        ),
      ).resolves.toBe("ok");
      expect(send).toHaveBeenCalledWith({ firstName: "Grace" });
    } finally {
      unregister();
    }
  });
});
