"use client";

import { useSyncExternalStore } from "react";
import { isBotFormReady, subscribeBotForms } from "@/lib/bot-protection";

const serverSnapshot = () => false;

/** A form may submit only after its visible checkbox has completed verification. */
export function useBotProtectionReady(path: string, method = "POST") {
  return useSyncExternalStore(
    subscribeBotForms,
    () => isBotFormReady(method, path),
    serverSnapshot,
  );
}
