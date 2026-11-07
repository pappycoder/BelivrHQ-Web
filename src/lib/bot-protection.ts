/** Transport fields are added by the form controller before a protected request. */
export interface BotProtectionFields {
  altcha: string;
  website: string;
}
export interface BotFormController {
  acquire: (signal?: AbortSignal) => Promise<BotProtectionFields>;
  reset: () => void;
}

const controllers = new Map<string, BotFormController>();
const inFlight = new Set<string>();
const ready = new Set<string>();
const listeners = new Set<() => void>();

export function setBotFormReady(
  method: string,
  path: string,
  verified: boolean,
) {
  const key = `${method}:${path}`;
  if (ready.has(key) === verified) return;
  if (verified) ready.add(key);
  else ready.delete(key);
  listeners.forEach((listener) => listener());
}

export function isBotFormReady(method: string, path: string) {
  return ready.has(`${method}:${path}`);
}

export function subscribeBotForms(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requiresBotProtection(method: string, path: string): boolean {
  return (
    (method === "POST" &&
      /^\/auth\/(login(?:\/2fa)?|register|forgot-password|accept-invitation)$/.test(
        path,
      )) ||
    (method === "PATCH" && path === "/auth/reset-password") ||
    (method === "POST" &&
      /^\/(?:forms|intake)\/public\/[a-zA-Z0-9_-]+\/submit$/.test(path)) ||
    (method === "PUT" && path === "/auth/password") ||
    (method === "POST" &&
      ["/profiles/invite", "/church/invite", "/broadcasts"].includes(path)) ||
    (method === "POST" &&
      /^\/profiles\/[a-zA-Z0-9_-]+\/reset-password$/.test(path))
  );
}

export function registerBotForm(
  method: string,
  path: string,
  controller: BotFormController,
) {
  const key = `${method}:${path}`;
  controllers.set(key, controller);
  setBotFormReady(method, path, false);
  return () => {
    if (controllers.get(key) === controller) {
      controllers.delete(key);
      setBotFormReady(method, path, false);
    }
  };
}

/** Keep proof acquisition around the entire request, including silent session refresh. */
export async function withBotProtection<T>(
  method: string,
  path: string,
  body: unknown,
  signal: AbortSignal | undefined,
  send: (body: unknown) => Promise<T>,
): Promise<T> {
  if (!requiresBotProtection(method, path)) return send(body);
  const key = `${method}:${path}`;
  const controller = controllers.get(key);
  if (!controller)
    throw new Error("Verification is still loading. Please try again.");
  if (inFlight.has(key))
    throw new Error("This submission is already being sent.");
  inFlight.add(key);
  try {
    const fields = await controller.acquire(signal);
    signal?.throwIfAborted();
    return await send({ ...((body as object) ?? {}), ...fields });
  } finally {
    controller.reset();
    inFlight.delete(key);
  }
}
