"use client";

import * as React from "react";
import type { AltchaWidgetElement } from "altcha";
import { refreshSession } from "@/lib/api";
import { registerBotForm, setBotFormReady } from "@/lib/bot-protection";

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
    "Check the box to verify your browser.",
  );
  const [failed, setFailed] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
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
    let explicitlyVerified = false;

    const verify = async (signal?: AbortSignal): Promise<string> => {
      if (verifiedPayload && widget?.getState?.() === "verified")
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
            const result = await widget?.verify?.({ controller });
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
    retry.current = () => {
      if (!widget || typeof widget.reset !== "function") {
        setAttempt((value) => value + 1);
        return;
      }
      if (work) return;
      verifiedPayload = undefined;
      widget.reset();
      setStatus("Check the box to verify your browser.");
      setFailed(false);
    };

    void import("altcha")
      .then(async () => {
        if (disposed) return;
        widget = document.createElement("altcha-widget");
        widget.setAttribute("display", "standard");
        widget.setAttribute("type", "native");
        // The API controller owns submission. Detach ALTCHA's internal checkbox
        // from native form validation so a pending solve cannot swallow Submit.
        widget.setAttribute("form", `altcha-detached-${id}`);
        container.append(widget);
        // Svelte custom-element methods become available on the next microtask.
        await Promise.resolve();
        if (disposed) return;
        await widget.configure({
          auto: "off",
          display: "standard",
          type: "native",
          workers: 2,
          timeout: 30000,
          name: "altcha",
          challenge: challengeUrl(path),
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers);
            headers.set("X-BelivrHQ-Client", "web");
            const options = {
              ...init,
              headers,
              cache: "no-store" as const,
              signal: AbortSignal.any([
                lifecycle.signal,
                AbortSignal.timeout(30000),
                ...(init?.signal ? [init.signal] : []),
              ]),
            };
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
        widget.addEventListener("verified", (event) => {
          if (disposed) return;
          const payload = (event as CustomEvent<{ payload: string }>).detail
            .payload;
          if (!payload) return;
          verifiedPayload = payload;
          explicitlyVerified = true;
          const moveFocus = container.contains(document.activeElement);
          setVerified(true);
          if (moveFocus)
            requestAnimationFrame(() => {
              if (disposed) return;
              const submit =
                container
                  .closest("form")
                  ?.querySelector<HTMLButtonElement>('button[type="submit"]') ??
                container.nextElementSibling?.querySelector<HTMLButtonElement>(
                  "button",
                );
              if (submit && !submit.disabled) submit.focus();
            });
          setBotFormReady(method, activePath, true);
          setStatus("Browser verified.");
          setFailed(false);
        });
        widget.addEventListener("statechange", (event) => {
          const state = (event as CustomEvent<{ state: string }>).detail.state;
          if (disposed) return;
          if (state !== "verified") {
            setVerified(false);
            verifiedPayload = undefined;
            setBotFormReady(method, activePath, false);
          }
          if (state === "verifying") {
            setStatus("Checking your browser…");
            setFailed(false);
          }
          if (state === "unverified")
            setStatus("Check the box to verify your browser.");
          if (state === "error") {
            setStatus("Verification could not finish. Please retry.");
            setFailed(true);
          }
          if (state === "expired") {
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
                  if (!explicitlyVerified)
                    throw new Error(
                      "Check the verification box before submitting.",
                    );
                  // Registration may immediately sign in with a separately scoped proof.
                  await work?.catch(() => {});
                  signal?.throwIfAborted();
                  if (disposed)
                    throw new Error("Verification form closed. Please retry.");
                  verifiedPayload = undefined;
                  widget?.reset?.();
                  await widget?.configure({
                    challenge: challengeUrl(targetPath),
                  });
                  activePath = targetPath;
                  await verify(signal);
                }
                // A submission joining background verification still observes its own cancellation.
                if (!verifiedPayload || widget?.getState?.() !== "verified")
                  throw new Error(
                    "Check the verification box and wait for verification before submitting.",
                  );
                const payload = verifiedPayload;
                signal?.throwIfAborted();
                return {
                  altcha: payload,
                  website: honeypot.current?.value ?? "",
                };
              },
              reset: () => {
                verifiedPayload = undefined;
                setBotFormReady(method, targetPath, false);
                if (!disposed) {
                  widget?.reset?.();
                  setStatus("Check the box to verify your browser.");
                }
              },
            }),
          );
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
      // ALTCHA clears exported methods on disconnection before React effect cleanup.
      widget?.reset?.();
      widget?.remove();
    };
  }, [method, path, authenticated, followUpPath, attempt, id]);

  return (
    <div
      className="my-3 space-y-1 text-sm text-muted-foreground"
      data-bot-protection
      data-bot-verified={verified ? "true" : "false"}
      hidden={verified}
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
