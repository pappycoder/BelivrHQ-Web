/** Public widget identifiers supplied by the BelivrHQ support team. No API secret. */
export const TAWK_EMBED_URL = "https://embed.tawk.to/6ad5c1c809d49434c8f515a2/1k59fptu4";
export const TAWK_CHAT_URL = "https://tawk.to/chat/6ad5c1c809d49434c8f515a2/1k59fptu4";

interface TawkApi {
  autoStart?: boolean;
  onBeforeLoad?: () => void;
  onLoad?: () => void;
  onStatusChange?: (status: string) => void;
  start?: (options: { showWidget: boolean }) => void;
  hideWidget?: () => void;
  showWidget?: () => void;
  maximize?: () => void;
  endChat?: () => void;
  logout?: (callback?: (error?: unknown) => void) => void;
  shutdown?: () => void;
}
declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}
let loading: Promise<TawkApi> | undefined;
let generation = 0;
let connected = false;
let wanted = false;
let suppressed = false;
/**
 * Whether Tawk's native floating launcher is allowed to show. Inside the
 * workspace the SupportChatTrigger chip replaces it (the bubble sat over
 * content on small screens), while public help pages keep the native one.
 */
let bubble = true;
let resume: (() => void) | undefined;

/** Show/hide the native floating launcher (chat can still be opened via maximize). */
export function setSupportWidgetBubble(show: boolean): void {
  if (bubble === show) return;
  bubble = show;
  const api = window.Tawk_API;
  if (!wanted || !connected || !api) return;
  if (show && !suppressed) api.showWidget?.();
  else api.hideWidget?.();
}

/** Temporarily hide the widget without ending the support conversation or disconnecting. */
export function setSupportWidgetSuppressed(value: boolean): void {
  if (suppressed === value) return;
  suppressed = value;
  const api = window.Tawk_API;
  if (value) api?.hideWidget?.();
  else if (wanted && connected && bubble) api?.showWidget?.();
}

function stopWidget(api: TawkApi) {
  api.hideWidget?.();
  api.shutdown?.();
}

function loadTawk(): Promise<TawkApi> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // Use the supplied embed's normal startup and native floating launcher.
    const api: TawkApi = { autoStart: true };
    window.Tawk_API = api;
    window.Tawk_LoadStart = new Date();
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      api.autoStart = false;
      api.onBeforeLoad = api.onLoad = () => stopWidget(api);
      api.onStatusChange = () => stopWidget(api);
      stopWidget(api);
      loading = undefined;
      reject(new Error("Chat could not load. Please try again or open the support link."));
    };
    const timer = setTimeout(fail, 20000);
    api.onBeforeLoad = () => {
      if (!wanted) {
        api.autoStart = false;
        stopWidget(api);
      }
      if (suppressed || !bubble) api.hideWidget?.();
    };
    api.onStatusChange = () => {
      if (!wanted) {
        connected = false;
        api.hideWidget?.();
        return;
      }
      // Offline is also ready: the provider's leave-a-message form can open.
      connected = true;
      resume?.();
      if (suppressed || !bubble) api.hideWidget?.();
    };
    api.onLoad = () => {
      clearTimeout(timer);
      const readyApi = window.Tawk_API ?? api;
      if (!wanted) {
        connected = false;
        stopWidget(readyApi);
      } else if (api.autoStart !== false || connected) {
        connected = true;
        resume?.();
      }
      if (suppressed || !bubble) readyApi.hideWidget?.();
      resolve(readyApi);
    };
    script.async = true;
    script.src = TAWK_EMBED_URL;
    script.charset = "UTF-8";
    script.crossOrigin = "anonymous";
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

/** Anonymous native widget: BelivrHQ tokens, profile and church data are never sent. */
async function showSupportWidget(expand: boolean): Promise<void> {
  const request = ++generation;
  wanted = true;
  const api = await loadTawk();
  if (request !== generation) return;
  if (!api.showWidget || (expand && !api.maximize))
    throw new Error("Chat is unavailable. Please try the support link.");
  if (!connected) {
    if (!api.start) throw new Error("Chat is unavailable. Please try the support link.");
    // A previous logout/scope change may have shut down the already-loaded SDK.
    // Wait for its connection/render callback instead of maximizing too early.
    await new Promise<void>((resolve, reject) => {
      const ready = () => {
        clearTimeout(timer);
        if (resume === ready) resume = undefined;
        resolve();
      };
      const timer = setTimeout(() => {
        if (resume === ready) resume = undefined;
        if (request === generation) {
          wanted = false;
          connected = false;
          stopWidget(api);
        }
        reject(new Error("Chat could not connect. Please try the support link."));
      }, 15000);
      resume = ready;
      api.start!({ showWidget: bubble && !suppressed });
    });
  }
  if (request !== generation) return;
  if (suppressed) { api.hideWidget?.(); return; }
  if (bubble) api.showWidget();
  else api.hideWidget?.();
  // The workspace chip opens the conversation directly; the launcher stays hidden.
  if (expand) api.maximize?.();
}

/** Mount Tawk's own floating bubble without opening the conversation window. */
export function initializeSupportWidget(): Promise<void> {
  return showSupportWidget(false);
}

/** Existing menu and billing links can still open the same native widget. */
export function openSupportChat(): Promise<void> {
  return showSupportWidget(true);
}

/** Invalidate pending opens immediately, including SDKs that finish after sign-out. */
export function closeSupportChat(): void {
  const request = ++generation;
  wanted = false;
  connected = false;
  resume?.();
  const api = window.Tawk_API;
  api?.hideWidget?.();
  api?.endChat?.();
  api?.logout?.(() => {
    if (request === generation) api.shutdown?.();
  });
  api?.shutdown?.();
}
