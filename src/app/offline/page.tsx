import Link from "next/link";
import { PublicPaperShell } from "@/components/shared/public-paper-shell";

// Temporarily disabled. Keep the workspace implementation for future builds.
// import { OfflineWorkspace } from "@/components/offline/offline-workspace";
export const metadata = {
  title: "Offline workspace - BelivrHQ",
  robots: { index: false, follow: false },
};
export default function OfflinePage() {
  // return <OfflineWorkspace />;
  // Keep this public route available as the service worker’s connection fallback.
  return (
    <PublicPaperShell>
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="paper-card max-w-md space-y-4 rounded-2xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Offline access is temporarily unavailable</h1>
        <p className="text-sm leading-relaxed text-ink-soft">Please reconnect to continue using BelivrHQ.</p>
        <Link href="/" prefetch={false} className="inline-block text-sm font-medium text-brand underline underline-offset-4">Return to BelivrHQ</Link>
      </div>
    </div>
    </PublicPaperShell>
  );
}
