"use client";

import { LoadingState } from "@/components/shared/loading-state";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, BookOpen, CheckCircle2, MessageCircleQuestion, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import { useSupportChat } from "@/components/support/support-chat-provider";
import { authorizationScopeKey } from "@/lib/authorization-cache";
import { checkRule, matchRoutePermission } from "@/lib/route-permissions";
import { featureForPath } from "@/lib/plan-features";
import { getToastErrorMessage } from "@/lib/toast";
import type { CurrentProfile } from "@/hooks/use-profile";

interface Reply {
  answer: string; mode: "ai" | "guides"; notice?: string; knowledgeVersion: string;
  sources: { id: string; title: string; path?: string }[];
  navigation: { title: string; path: string; trail: string }[];
  access: { label: string; status: string; detail: string }[];
}
interface Context {
  mode: "ai" | "guides";
  scope: { roles: string[]; location: string; plan: string; subscriptionActive: boolean };
  limits: { churchDailyQuestions: number; userDailyQuestions: number; resetTimezone: string };
}
interface Turn { id: number; question: string; reply?: Reply; error?: string; }
const SUGGESTIONS = ["Explain this page", "What can I access on this page?", "How do I approve form submissions?", "How do table display controls work?"];

export function AskBelivrHQ() {
  const { isAuthenticated } = useAuth();
  const { data: profile, isError } = useCurrentProfile();
  const { ready } = usePermissions();
  if (!isAuthenticated || !ready || isError || !profile || profile.status !== "active") return null;
  return <AssistantPanel key={authorizationScopeKey(profile) + JSON.stringify(profile.role)} profile={profile} />;
}
function AssistantPanel({ profile }: { profile: CurrentProfile }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<Context | null>(null);
  const [contextError, setContextError] = useState("");
  const [contextAttempt, setContextAttempt] = useState(0);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const page = matchRoutePermission(pathname)?.prefix ?? "/home";
  const { canAny } = usePermissions();
  const { setChatSuppressed } = useSupportChat();

  useEffect(() => {
    setChatSuppressed(open);
    return () => setChatSuppressed(false);
  }, [open, setChatSuppressed]);

  useEffect(() => () => { active.current?.abort(); }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setContextError(""); setContext(null);
    const timeout = window.setTimeout(() => {
      controller.abort();
      setContext(null);
      setContextError("BelivrHQ took too long to verify assistant access. Please retry.");
    }, 15000);
    api.get<Context>("/assistant/context", { signal: controller.signal }).then(value => {
      if (!value || !["ai", "guides"].includes(value.mode) || !value.scope || !value.limits)
        throw new Error("BelivrHQ couldn’t load assistant access. Please retry.");
      if (!controller.signal.aborted) setContext(value);
    }).catch(error => {
      if (!controller.signal.aborted) { setContext(null); setContextError(getToastErrorMessage(error, "We couldn’t verify assistant access. Please retry.")); }
    }).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [open, contextAttempt]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [turns, pending]);

  function safeNavigation(path: string) {
    if (!path.startsWith("/") || path.startsWith("//") || /[?#[\]\\\u0000-\u001f]/.test(path)) return false;
    const rule = matchRoutePermission(path);
    if (!rule || rule.prefix !== path || !checkRule(rule, canAny)) return false;
    const feature = featureForPath(path) ?? (/^\/departments(?:\/|$)/.test(path) ? "groups" : undefined);
    return !feature || profile.planFeatures?.includes(feature) === true;
  }
  async function send(text = question) {
    const cleaned = text.trim();
    if (!context || pending || active.current || cleaned.length === 0 || cleaned.length > 1200) return;
    const id = ++sequence.current;
    const controller = new AbortController();
    active.current = controller;
    const history = turns.filter(turn => turn.reply).slice(-3).map(turn => turn.question.slice(0, 600));
    setTurns(previous => [...previous.slice(-19), { id, question: cleaned }]);
    setQuestion(""); setPending(true);
    const timeout = window.setTimeout(() => {
      if (active.current !== controller) return;
      controller.abort(); active.current = null;
      setPending(false); setQuestion(cleaned);
      setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, error: "BelivrHQ took too long to answer. Your question is saved below; please try again." } : turn));
    }, 35000);
    try {
      const reply = await api.post<Reply>("/assistant/message", { question: cleaned, page, history }, { signal: controller.signal });
      if (!controller.signal.aborted) setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, reply } : turn));
    } catch (error) {
      if (!controller.signal.aborted) {
        setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, error: getToastErrorMessage(error, "We couldn’t answer that question. Please try again.") } : turn));
        setQuestion(cleaned);
      }
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setPending(false); }
    }
  }
  function reset() {
    active.current?.abort(); active.current = null;
    setPending(false); setTurns([]); setQuestion("");
  }
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button variant="outline" size="sm" aria-label="Ask BelivrHQ" className="gap-2 border-primary/25"><Sparkles className="size-4" /><span className="hidden lg:inline">Ask BelivrHQ</span></Button></SheetTrigger>
    <SheetContent className="w-full gap-0 p-0 sm:max-w-lg" aria-describedby="ask-belivrhq-description">
      <SheetHeader className="border-b bg-primary/5 p-5 pr-12">
        <SheetTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />Ask BelivrHQ</SheetTitle>
        <SheetDescription id="ask-belivrhq-description">A clear next step for your church workspace.</SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b px-5 py-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="size-3.5" />Product guidance · {context?.mode === "ai" ? "AI assisted" : "BelivrHQ references"}</p>
          <p className="mt-1 break-words">Page: {page.replace(/\[.*?\]/g, "record")} · {context?.scope.location ?? <LoadingState label="Checking your access" variant="inline" />}</p>
          {context?.mode === "ai" && <p className="mt-1">Your question and selected product guidance are sent to OpenAI. Keep questions general; avoid personal records, passwords and secrets.</p>}
          <p className="mt-1">This assistant explains the product. It cannot read church records or change anything.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5" role="log" aria-label="BelivrHQ assistant conversation" aria-live="polite" aria-relevant="additions text">
          {contextError ? <div role="alert" className="space-y-3 rounded-xl border p-4 text-sm"><p>{contextError}</p><Button variant="outline" size="sm" onClick={() => setContextAttempt(value => value + 1)}>Retry assistant</Button><p><Link href="/help" onClick={() => setOpen(false)} className="underline">Open Help Centre</Link></p></div> : !context ? <LoadingState label="Checking your access" variant="detail" className="p-0 sm:p-0" /> : turns.length === 0 ? <div className="space-y-5">
            <div className="rounded-2xl border bg-muted/30 p-5"><MessageCircleQuestion className="mb-3 size-7 text-primary" /><h3 className="font-semibold">What would you like to understand?</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Find a page, understand your access, or get steps for a BelivrHQ workflow. Answers include their references.</p></div>
            <div className="grid gap-2">{SUGGESTIONS.map(suggestion => <Button key={suggestion} variant="outline" className="h-auto justify-start whitespace-normal px-3 py-3 text-left" onClick={() => void send(suggestion)}>{suggestion}</Button>)}</div>
          </div> : <div className="space-y-6">{turns.map(turn => <article key={turn.id} className="space-y-3">
            <p className="ml-8 break-words rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground">{turn.question}</p>
            {turn.error && <p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm">{turn.error}</p>}
            {turn.reply && <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{turn.reply.mode === "ai" ? "AI-assisted answer" : "Verified BelivrHQ guidance"}</p>
              {turn.reply.notice && <p role="status" className="rounded-lg bg-muted p-3 text-xs">{turn.reply.notice}</p>}
              <p className="whitespace-pre-wrap break-words text-sm leading-7">{turn.reply.answer}</p>
              {turn.reply.access.length > 0 && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">Verified access checks</summary><ul className="mt-3 space-y-3">{turn.reply.access.map((item, index) => <li key={index} className="text-xs"><p className="flex items-start gap-2 font-medium"><CheckCircle2 className="mt-0.5 size-3 shrink-0" /><span className="break-all">{item.label} · {item.status.replaceAll("_", " ")}</span></p><p className="mt-1 leading-5 text-muted-foreground">{item.detail}</p></li>)}</ul></details>}
              {turn.reply.navigation.filter(item => safeNavigation(item.path)).length > 0 && <div className="flex flex-wrap gap-2">{turn.reply.navigation.filter(item => safeNavigation(item.path)).map(item => <Button key={item.path} asChild variant="outline" size="sm"><Link href={item.path} onClick={() => setOpen(false)} title={item.trail}>Open {item.title}</Link></Button>)}</div>}
              {turn.reply.sources.length > 0 && <div className="space-y-2 border-t pt-3"><p className="flex items-center gap-1.5 text-xs font-medium"><BookOpen className="size-3" />References</p>{turn.reply.sources.map(source => source.path && /^\/help(?:\/[a-z0-9-]+)?$/.test(source.path) ? <Link key={source.id} href={source.path} onClick={() => setOpen(false)} className="block text-xs leading-5 text-primary underline underline-offset-2">{source.title}</Link> : <p key={source.id} className="text-xs leading-5 text-muted-foreground">{source.title} · BelivrHQ product reference</p>)}</div>}
            </div>}
          </article>)}</div>}
          {pending && <LoadingState label="Finding your next step" variant="detail" className="mt-4 rounded-2xl border bg-muted/20" />}
          <div ref={end} />
        </div>
        <form className="shrink-0 space-y-2 border-t bg-background p-4" onSubmit={event => { event.preventDefault(); void send(); }}>
          <label htmlFor="belivrhq-question" className="sr-only">Your BelivrHQ question</label>
          <Textarea id="belivrhq-question" aria-describedby="belivrhq-question-hint" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1200} placeholder="Ask about BelivrHQ…" disabled={!context || pending} className="max-h-32 min-h-20 resize-none" onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
          <div id="belivrhq-question-hint" className="text-xs text-muted-foreground">{!context ? (contextError ? "Retry assistant access to send a question." : <LoadingState label="Checking access before you can send" variant="inline" />) : pending ? <LoadingState label="Waiting for an answer" variant="inline" /> : question.trim().length === 0 ? "Type a question to send." : "Press Enter to send, or Shift+Enter for a new line."}</div>
          <div className="flex items-center justify-between gap-2"><Button type="button" variant="ghost" size="sm" onClick={reset} disabled={!turns.length}><RotateCcw className="size-3.5" />New conversation</Button><Button type="submit" size="sm" disabled={!context || pending || question.trim().length === 0} aria-label="Send BelivrHQ question"><ArrowUp className="size-4" />Send</Button></div>
          <p className="text-[11px] leading-4 text-muted-foreground">{context?.mode === "ai" ? `AI allowance: up to ${context.limits.userDailyQuestions} questions per person and ${context.limits.churchDailyQuestions} per church daily, subject to shared availability. ` : "Answers use BelivrHQ product references. "}Conversation stays in this tab and clears when your access changes.</p>
        </form>
      </div>
    </SheetContent>
  </Sheet>;
}
