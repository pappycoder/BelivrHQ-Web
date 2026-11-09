"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail, MessageCircle, BookOpen, Sparkles } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/hooks/use-profile";
import { number } from "@/lib/paper/format";

const TAWK_PROPERTY = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? "";
const TAWK_WIDGET = process.env.NEXT_PUBLIC_TAWWIDGET_ID ?? TAWK_PROPERTY;

/**
 * Support — the Paper desk. The Tawk widget (when configured) owns the
 * floating bubble; this page is the calm front door: live chat, the help
 * centre, and the honest email fallback.
 */
export default function SupportPage() {
  const { data: profile } = useCurrentProfile();
  const [chatReady, setChatReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!TAWK_WIDGET || loaded.current) return;
    loaded.current = true;
    const w = window as unknown as { Tawk_API?: { onLoad?: () => void } & Record<string, unknown>; Tawk_LoadStart?: Date };
    w.Tawk_LoadStart = new Date();
    const onLoad = () => setChatReady(true);
    if (w.Tawk_API) w.Tawk_API.onLoad = onLoad;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://embed.tawk.to/${TAWK_WIDGET}/default`;
    s.charset = "UTF-8";
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
    // If the widget was already embedded on this page, reflect it immediately.
    const poll = window.setTimeout(() => {
      if ((window as unknown as { Tawk_API?: { maximize?: () => void } }).Tawk_API?.maximize) setChatReady(true);
    }, 2500);
    return () => window.clearTimeout(poll);
  }, []);

  const openChat = () => {
    const t = window as unknown as { Tawk_API?: { maximize?: () => void; loadChat?: () => void } };
    if (t.Tawk_API?.maximize) t.Tawk_API.maximize();
    else if (t.Tawk_API?.loadChat) t.Tawk_API.loadChat();
    else window.open("https://tawk.to/chat", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="We&apos;re a message away."
        description="Real humans, in-app chat, and a help centre written by the people who built this."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard eyebrow="Live chat" title="Talk to a human" className="lg:col-span-1">
          <p className="text-[11px] leading-relaxed text-ink-soft">
            {chatReady
              ? "The chat bubble is ready at the bottom-right of the page."
              : "The chat bubble will appear at the bottom-right once it loads. This may take a moment."}
          </p>
          <Button className="mt-4 h-10 w-full gap-2 rounded-lg text-sm" onClick={openChat}>
            <MessageCircle className="size-4" /> Open live chat
          </Button>
        </SectionCard>

        <SectionCard eyebrow="Help centre" title="Answers before questions" className="lg:col-span-1">
          <p className="text-[11px] leading-relaxed text-ink-soft">
            Twenty articles on members, attendance, giving, events and more. Search without signing in.
          </p>
          <Button asChild variant="outline" className="mt-4 h-10 w-full gap-2 rounded-lg border-line text-sm">
            <Link href="/help">
              <BookOpen className="size-4" /> Browse the help centre
            </Link>
          </Button>
        </SectionCard>

        <SectionCard eyebrow="Email" title="The quiet fallback" className="lg:col-span-1">
          <p className="text-[11px] leading-relaxed text-ink-soft">
            Chat not your style? Every message finds the same team, with a thread to keep.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-4 h-10 w-full gap-2 rounded-lg border-line text-sm"
          >
            <a href="mailto:tickets@churchos.p.tawk.email">
              <Mail className="size-4" /> Email support
            </a>
          </Button>
        </SectionCard>
      </div>

      <div className="paper-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {profile?.firstName ? `${profile.firstName}, the desk is open.` : "The desk is open."}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-faint">
              Administrators get the live widget; everyone can reach the email thread. Our target for the first reply is {number(1)} working day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
