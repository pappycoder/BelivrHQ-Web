import { publicPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "@/components/shared/json-ld";
import { helpArticles } from "@/lib/help/catalog";
import Link from "next/link";
import { HelpSearch } from "@/components/help/help-search";
import { helpSearchIndex } from "@/lib/help/content";
import { Button } from "@/components/ui/button";
export const metadata = publicPageMetadata({
  title: "Help Centre", path: "/help", image: "/og/help.png",
  description: "Practical BelivrHQ guides for onboarding, members, attendance, subscriptions and troubleshooting. Open to everyone.",
});
export default function HelpPage() {
  return (
    <div className="space-y-10">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "CollectionPage",
        name: "BelivrHQ Help Centre", url: absoluteUrl("/help"), inLanguage: "en",
        mainEntity: { "@type": "ItemList", itemListElement: helpArticles.map((article, index) => ({
          "@type": "ListItem", position: index + 1, name: article.title,
          url: absoluteUrl(`/help/${article.slug}`),
        })) },
      }} />
      <header className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">
          BELIVRHQ HELP CENTRE
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          How can we help?
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Find a clear next step, from welcoming your first visitor to managing
          your church workspace. No sign-in needed.
        </p>
      </header>
      <HelpSearch index={helpSearchIndex()} />
      <aside className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border bg-accent/40 p-6 sm:p-8">
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold">Still need a hand?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Church administrators can contact BelivrHQ Support through the in-app live chat.
            Your church administrator still manages roles and church settings.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/help/contact-support">
            Contact BelivrHQ Support
          </Link>
        </Button>
      </aside>
    </div>
  );
}
