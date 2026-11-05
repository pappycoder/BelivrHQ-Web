"use client";

import * as React from "react";
import type { AltchaWidgetElement } from "altcha";
import { refreshSession } from "@/lib/api";
import { registerBotForm } from "@/lib/bot-protection";

export function BotProtection({
  path,
  method = "POST",
  authenticated = false,
  followUpPath,
}: {
  path: string;
  method?: string;
  authenticated?: boolean;
  followUpPath?: string;
}) {
  const id = React.useId();
  const host = React.useRef<HTMLDivElement>(null);
  const honeypot = React.useRef<HTMLInputElement>(null);
  const retry = React.useRef<() => void>(() => {});
  const [status, setStatus] = React.useState(
    "Verification starts automatically.",
  );
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let widget: AltchaWidgetElement | undefined;
    const unregister: (() => void)[] = [];
    let activePath = path;
    const challengeUrl = (targetPath: string) =>
      `/api/backend/bot-protection/${authenticated ? "authenticated-challenge" : "challenge"}?${new URLSearchParams({ method, path: targetPath })}`;
    let work: Promise<string> | undefined;
    let verifiedPayload: string | undefined;
    const lifecycle = new AbortController();
    const form = container.closest("form") ?? container.parentElement;

    const verify = async (signal?: AbortSignal): Promise<string> => {
      if (verifiedPayload && widget?.getState() === "verified")
        return verifiedPayload;
      if (!work) {
        work = (async () => {
          setStatus("Checking your browser…");
          setFailed(false);
          const controller = new AbortController();
          const deadline = setTimeout(() => controller.abort(), 30000);
          const abort = () => controller.abort();
          lifecycle.signal.addEventListener("abort", abort, { once: true });
          signal?.addEventListener("abort", abort, { once: true });
          try {
            signal?.throwIfAborted();
            const result = await widget?.verify({ controller });
            if (!result?.payload)
              throw new Error("Verification could not finish. Please retry.");
            verifiedPayload = result.payload;
            if (!disposed) setStatus("Browser verified.");
            return result.payload;
          } catch (error) {
            if (!disposed) {
              setStatus("Verification could not finish. Please retry.");
              setFailed(true);
            }
            throw error;
          } finally {
            clearTimeout(deadline);
            lifecycle.signal.removeEventListener("abort", abort);
            signal?.removeEventListener("abort", abort);
          }
        })().finally(() => {
          work = undefined;
        });
      }
      return work;
    };
    const start = () => {
      if (widget && !work) void verify().catch(() => {});
    };
    retry.current = () => {
      if (!widget) {
        setAttempt((value) => value + 1);
        return;
      }
      if (work) return;
      verifiedPayload = undefined;
      widget.reset();
      start();
    };

    void import("altcha")
      .then(async () => {
        if (disposed) return;
        widget = document.createElement("altcha-widget");
        widget.setAttribute("display", "invisible");
        // The API controller owns submission. Detach ALTCHA's internal checkbox
        // from native form validation so a pending solve cannot swallow Submit.
        widget.setAttribute("form", `altcha-detached-${id}`);
        container.append(widget);
        // Svelte custom-element methods become available on the next microtask.
        await Promise.resolve();
        if (disposed) return;
        await widget.configure({
          auto: "off",
          display: "invisible",
          workers: 2,
          name: "altcha",
          challenge: challengeUrl(path),
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers);
            headers.set("X-ChurchOS-Client", "web");
            const options = { ...init, headers, cache: "no-store" as const };
            let response = await fetch(input, options);
            if (
              authenticated &&
              response.status === 401 &&
              (await refreshSession())
            )
              response = await fetch(input, options);
            return response;
          },
        });
        if (disposed) return;
        widget.addEventListener("statechange", (event) => {
          const state = (event as CustomEvent<{ state: string }>).detail.state;
          if (state === "expired" && !disposed) {
            verifiedPayload = undefined;
            setStatus("Verification expired. Please retry.");
            setFailed(true);
          }
        });
        for (const targetPath of new Set([
          path,
          ...(followUpPath ? [followUpPath] : []),
        ]))
          unregister.push(
            registerBotForm(method, targetPath, {
              acquire: async (signal) => {
                if (activePath !== targetPath) {
                  // Registration may immediately sign in with a separately scoped proof.
                  await work?.catch(() => {});
                  signal?.throwIfAborted();
                  if (disposed)
                    throw new Error("Verification form closed. Please retry.");
                  verifiedPayload = undefined;
                  widget?.reset();
                  await widget?.configure({
                    challenge: challengeUrl(targetPath),
                  });
                  activePath = targetPath;
                }
                // A submission joining background verification still observes its own cancellation.
                const payload = await verify(signal);
                signal?.throwIfAborted();
                return {
                  altcha: payload,
                  website: honeypot.current?.value ?? "",
                };
              },
              reset: () => {
                verifiedPayload = undefined;
                if (!disposed) {
                  widget?.reset();
                  setStatus("Verification starts automatically.");
                }
              },
            }),
          );
        form?.addEventListener("focusin", start);
        form?.addEventListener("pointerdown", start);
        if (form?.contains(document.activeElement)) start();
      })
      .catch(() => {
        if (!disposed) {
          setStatus("Verification could not load. Please retry.");
          setFailed(true);
        }
      });

    return () => {
      disposed = true;
      lifecycle.abort();
      unregister.forEach((remove) => remove());
      form?.removeEventListener("focusin", start);
      form?.removeEventListener("pointerdown", start);
      widget?.remove();
    };
  }, [method, path, authenticated, followUpPath, attempt, id]);

  return (
    <div
      className="my-3 space-y-1 text-xs text-muted-foreground"
      data-bot-protection
    >
      <div
        aria-hidden="true"
        inert
        style={{
          position: "absolute",
          left: "-10000px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor={id}>Website</label>
        <input
          ref={honeypot}
          id={id}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
        />
      </div>
      <div ref={host} />
      <p role="status" aria-label="Browser verification" aria-live="polite">
        {status}
      </p>
      {failed && (
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => retry.current()}
        >
          Retry verification
        </button>
      )}
    </div>
  );
}
