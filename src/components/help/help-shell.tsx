"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { helpArticles, helpTopics } from "@/lib/help/catalog";

/**
 * @file Help Centre browser — the topic rail + article body. The page frame
 * (marketing header, Paper tokens, footer) comes from PublicPaperShell in the
 * help layout; this component only owns the two-column browse layout and the
 * topic navigation, styled with the Paper grammar.
 */

function TopicNavigation() {
  const path = usePathname();
  const article = helpArticles.find((item) => path === `/help/${item.slug}`);
  return (
    <nav aria-label="Help topics" className="space-y-5">
      <Link
        href="/help"
        aria-current={path === "/help" ? "page" : undefined}
        className="flex items-center gap-2 font-display text-sm font-semibold text-brand"
      >
        <BookOpen className="size-4" />
        All guides
      </Link>
      {helpTopics.map((topic) => (
        <div key={topic.id} className="space-y-2">
          <Link
            href={`/help?topic=${topic.id}`}
            className="block text-sm font-medium transition-colors hover:text-brand"
          >
            {topic.title}
          </Link>
          {article?.topic === topic.id && (
            <ul className="space-y-1 border-l border-line pl-3">
              {helpArticles
                .filter((item) => item.topic === topic.id)
                .map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/help/${item.slug}`}
                      aria-current={item.slug === article.slug ? "page" : undefined}
                      className={`block rounded-lg px-2 py-1.5 text-sm leading-relaxed transition-colors ${
                        item.slug === article.slug
                          ? "bg-brand-soft/60 font-medium text-ink"
                          : "text-ink-faint hover:bg-muted hover:text-ink"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}

export function HelpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12">
      <aside className="paper-card sticky top-28 hidden rounded-2xl p-5 lg:block">
        <TopicNavigation />
      </aside>
      <div className="min-w-0 space-y-6">
        <details className="paper-card rounded-2xl p-4 lg:hidden">
          <summary className="cursor-pointer font-display text-sm font-semibold">Browse help topics</summary>
          <div className="mt-5">
            <TopicNavigation />
          </div>
        </details>
        {children}
      </div>
    </div>
  );
}
