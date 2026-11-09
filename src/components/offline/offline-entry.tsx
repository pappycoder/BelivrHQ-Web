"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WifiOff, HardDriveDownload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

const DISMISSED = "belivrhq-offline-banner-dismissed";

export function OfflineHeaderButton() {
  const { ready, can } = usePermissions();
  if (!ready || !can("offline", "read")) return null;
  return (
    <Link
      href="/offline"
      prefetch={false}
      className="inline-flex size-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Offline workspace"
      title="Offline workspace"
    >
      <HardDriveDownload size={18} aria-hidden="true" />
    </Link>
  );
}

export function OfflineEntry() {
  const { ready, can } = usePermissions();
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISSED) === "true");
    } catch {
      setDismissed(false);
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!ready || !can("offline", "read") || dismissed) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-2 text-sm">
      <span className="flex items-center gap-2">
        {offline ? (
          <>
            <WifiOff size={16} aria-hidden="true" />
            Connection lost. Use your prepared offline workspace.
          </>
        ) : (
          <>
            <HardDriveDownload size={16} aria-hidden="true" />
            Prepare this device to work offline.
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/offline" prefetch={false}>Offline workspace</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss offline banner"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISSED, "true");
            } catch {
              /* Optional preference. */
            }
          }}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
