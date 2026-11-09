import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { JsonLd } from "@/components/shared/json-ld";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import {
  helpArticles,
  helpArticle,
  helpTopic,
  HELP_REVIEWED_AT,
} from "@/lib/help/catalog";
import { helpContent } from "@/lib/help/content";
import { Button } from "@/components/ui/button";
import { SupportChatButton } from "@/components/support/support-chat-button";
// Published guides are prebuilt; unknown slugs reach our helpful 404 page.
export const dynamicParams = true;
export function generateStaticParams() {
  return helpArticles.map((article) => ({ slug: article.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = helpArticle((await params).slug);
  if (!article)
    return {
      title: "Guide not found",
      robots: { index: false, follow: false },
    };
  return publicPageMetadata({
    title: `${article.title} | BelivrHQ Help Centre`,
    description: article.summary, path: `/help/${article.slug}`,
    image: `/og/help/${article.slug}.png`, article: true, modifiedTime: HELP_REVIEWED_AT,
  });
}
export default async function HelpArticlePage({ params }: Props) {
  const article = helpArticle((await params).slug);
  if (!article) notFound();
  const topic = helpTopic(article.topic)!;
  const sections = helpContent[article.slug];
  const related = helpArticles
    .filter(
      (item) => item.slug !== article.slug && item.topic === article.topic,
    )
    .slice(0, 3);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "TechArticle", "@id": absoluteUrl(`/help/${article.slug}#article`),
            headline: article.title, description: article.summary,
            url: absoluteUrl(`/help/${article.slug}`), mainEntityOfPage: absoluteUrl(`/help/${article.slug}`),
            image: absoluteUrl(`/og/help/${article.slug}.png`), dateModified: HELP_REVIEWED_AT,
            inLanguage: "en", articleSection: topic.title,
            author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
            publisher: { "@type": "Organization", name: SITE_NAME,
              logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512x512.png") } } },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Help Centre", item: absoluteUrl("/help") },
            { "@type": "ListItem", position: 2, name: article.title, item: absoluteUrl(`/help/${article.slug}`) },
          ] },
        ],
      }} />
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/help" className="hover:text-foreground">
          Help Centre
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/help?topic=${topic.id}`}
          className="hover:text-foreground"
        >
          {topic.title}
        </Link>
      </nav>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
        <article className="min-w-0">
          <header className="mb-9 space-y-4 border-b pb-8">
            <p className="text-sm font-medium text-primary">{topic.title}</p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {article.summary}
            </p>
            <p className="text-xs text-muted-foreground">
              {article.minutes} min read <span aria-hidden="true">·</span> Last
              reviewed <time dateTime={HELP_REVIEWED_AT}>19 October 2026</time>
            </p>
          </header>
          <details className="mb-8 rounded-xl border bg-card p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium">
              On this page
            </summary>
            <nav aria-label="Article contents" className="mt-3 space-y-2">
              {sections.map((section) => (
                <a
                  className="block text-sm text-muted-foreground hover:text-foreground"
                  key={section.id}
                  href={`#${section.id}`}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </details>
          <div className="space-y-10">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-8 space-y-4"
              >
                <h2 className="text-xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-base leading-8 text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.steps && (
                  <ol className="list-decimal space-y-4 pl-6 marker:font-semibold marker:text-primary">
                    {section.steps.map((step) => (
                      <li
                        key={step}
                        className="pl-2 leading-8 text-muted-foreground"
                      >
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
                {section.bullets && (
                  <ul className="list-disc space-y-3 pl-5 marker:text-primary">
                    {section.bullets.map((item) => (
                      <li
                        key={item}
                        className="pl-2 leading-8 text-muted-foreground"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {section.note && (
                  <aside className="rounded-xl border border-primary/20 bg-accent/50 p-5 text-sm leading-7">
                    {section.note}
                  </aside>
                )}
              </section>
            ))}
          </div>
          <aside className="mt-12 rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Still need help?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Church administrators can chat with BelivrHQ Support for product help. For
              role assignments or church settings, start with your church administrator.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/help/get-help-and-report-a-problem">
                  How to get help
                </Link>
              </Button>
              <SupportChatButton />
            </div>
          </aside>
          {related.length > 0 && (
            <section className="mt-10 space-y-4" aria-label="Related guides">
              <h2 className="text-lg font-semibold">Keep going</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <Link
                    className="flex items-start gap-3 rounded-xl border p-4 text-sm font-medium hover:bg-accent"
                    key={item.slug}
                    href={`/help/${item.slug}`}
                  >
                    <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <Link
            href="/help"
            className="mt-9 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            All guides
          </Link>
        </article>
        <aside className="sticky top-8 hidden space-y-4 border-l pl-5 lg:block">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            On this page
          </h2>
          <nav aria-label="Article contents" className="space-y-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block text-sm leading-relaxed text-muted-foreground hover:text-primary"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
