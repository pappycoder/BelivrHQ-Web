import Link from "next/link";
import { MarketingNavigation } from "@/components/marketing/landing-interactions";
import { BrandLogo } from "@/components/shared/brand-logo";

/**
 * @file Public shell for pre-auth / outside-workspace pages (billing hand-off,
 * payment return, offline, legal). Uses the landing page's header, inherits
 * the Paper design tokens via [data-paper-root], and carries none of the
 * workspace chrome.
 */
export function PublicPaperShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-paper-root className="flex min-h-svh flex-col bg-background text-foreground">
      <div className="print:hidden">
        <MarketingNavigation />
      </div>
      {/* The landing header is fixed — clear it. */}
      <main className="flex-1 pt-20 sm:pt-24">{children}</main>
      <footer className="border-t border-line print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-7">
          <span className="flex items-center gap-2.5">
            <BrandLogo variant="mark" emblemClassName="size-8" />
            <span className="text-[10px] uppercase tracking-wider text-ink-faint">
              BelivrHQ church management
            </span>
          </span>
          <span className="flex items-center gap-4 text-[11px]">
            <Link href="/help" className="text-ink-soft hover:text-ink">Help centre</Link>
            <Link href="/help/contact-support" className="text-ink-soft hover:text-ink">Contact support</Link>
            <Link href="/" className="text-ink-soft hover:text-ink">Home</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
