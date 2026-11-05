"use client";

import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getToastErrorMessage, toast } from "@/lib/toast";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Loader2,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSubmitFormPublic, type FormField } from "@/hooks/use-forms";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { SubmissionAttachments } from "@/components/forms/submission-attachments";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicFormPayload {
  title: string;
  description?: string;
  fields: FormField[];
}

export default function PublicFormPage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  return <PublicFormContent key={publicToken} token={publicToken} />;
}

function answered(value: unknown) {
  return (
    value !== undefined &&
    value !== null &&
    (typeof value !== "string" || value.trim() !== "") &&
    (!Array.isArray(value) || value.length > 0)
  );
}

function PublicFormContent({ token }: { token: string }) {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [assetIds, setAssetIds] = React.useState<string[]>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const publicMutation = useSubmitFormPublic(token);
  const captchaReady = useBotProtectionReady(`/forms/public/${token}/submit`);
  const [form, setForm] = React.useState<PublicFormPayload | null>(null);
  const [isPending, setPending] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const inFlight = React.useRef(false);
  const refetch = () => setAttempt((previous) => previous + 1);
  React.useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    setError(false);
    void api
      .get<PublicFormPayload>(`/forms/public/${encodeURIComponent(token)}/meta`, {
        skipAuth: true,
        signal: controller.signal,
      })
      .then((payload) => {
        if (!payload || typeof payload.title !== "string" || !Array.isArray(payload.fields))
          throw new Error("Invalid form metadata");
        if (!controller.signal.aborted) setForm(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [token, attempt]);
  const required = form?.fields.filter((field) => field.required) ?? [];
  const completed = form?.fields.filter((field) => answered(answers[field.key])).length ?? 0;
  const requiredDone = required.filter((field) => answered(answers[field.key])).length;
  const progress = form?.fields.length ? Math.round((completed / form.fields.length) * 100) : 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || inFlight.current) return;
    if (required.some((field) => !answered(answers[field.key]))) {
      setFailure("Please complete all required questions before submitting.");
      return;
    }
    setFailure(null);
    inFlight.current = true;
    setSending(true);
    try {
      await publicMutation.mutateAsync({
        data: answers,
        attachmentAssetIds: assetIds.length ? assetIds : undefined,
      });
      setSubmitted(true);
    } catch (cause) {
      const message = getToastErrorMessage(
        cause,
        "We could not send your response. Your answers are still here; please try again.",
      );
      setFailure(message);
      toast.error("Response not sent", { description: message });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div data-paper-root className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link href="/" aria-label="ChurchOS home">
          <BrandLogo variant="full" emblemClassName="!h-9 dark:brightness-0 dark:invert" />
        </Link>
        <span className="flex items-center gap-2 rounded-full border border-current/10 bg-white/60 px-3 py-2 text-xs dark:bg-card">
          <ClipboardList className="size-3.5" />
          Community forms
        </span>
      </header>
      <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-0 px-4 pb-10 sm:px-8 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <aside className="relative overflow-hidden rounded-t-3xl bg-[var(--brand)] px-6 py-8 text-white sm:p-10 lg:rounded-l-3xl lg:rounded-tr-none">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full border-[40px] border-white/5"
          />
          <div className="relative lg:sticky lg:top-10">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d6e5ba]">
              A place to connect
            </p>
            {isPending ? (
              <div className="mt-6 space-y-4">
                <Skeleton className="h-10 w-4/5 bg-white/10" />
                <Skeleton className="h-20 w-full bg-white/10" />
              </div>
            ) : (
              <>
                <h1 className="mt-5 break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  {form?.title || "This form is unavailable"}
                </h1>
                <p className="mt-5 whitespace-pre-line break-words text-sm leading-7 text-white/75">
                  {form?.description ||
                    (form
                      ? "Thank you for taking a moment to share your response. Complete the questions, then send it to the team that shared this form."
                      : "The link may have expired or the form may no longer be accepting responses.")}
                </p>
              </>
            )}
            {form && !submitted && (
              <>
                <div className="mt-7 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/15 px-3 py-2">
                    {form.fields.length} questions
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-2">
                    {required.length} required
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-2">
                    No sign-in needed
                  </span>
                </div>
                <div className="mt-8 border-t border-white/15 pt-6">
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs text-white/80">
                    <span>Your progress</span>
                    <span>
                      {completed} of {form.fields.length} answered
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Form completion"
                    aria-valuemin={0}
                    aria-valuemax={form.fields.length || 1}
                    aria-valuenow={completed}
                    className="h-1.5 overflow-hidden rounded-full bg-white/15"
                  >
                    <div
                      className="h-full rounded-full bg-[#d6e5ba] transition-[width] motion-reduce:transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {required.length > 0 && (
                    <p className="mt-3 text-xs text-white/65">
                      {requiredDone} of {required.length} required questions completed
                    </p>
                  )}
                </div>
              </>
            )}
            <p className="mt-8 flex items-start gap-2 text-xs leading-6 text-white/65">
              <LockKeyhole className="mt-1 size-3.5 shrink-0" />
              Your response goes to the team that shared this form.
            </p>
          </div>
        </aside>
        <section
          className="min-w-0 rounded-b-3xl border border-t-0 bg-white p-6 shadow-sm dark:bg-card sm:p-10 lg:rounded-r-3xl lg:rounded-bl-none lg:border-t lg:border-l-0"
          aria-label="Your response"
        >
          {isPending ? (
            <div role="status" aria-label="Loading form" className="space-y-7">
              <Skeleton className="h-7 w-40" />
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
          ) : error || !form ? (
            <div className="flex min-h-72 flex-col items-start justify-center gap-4">
              <span className="rounded-2xl bg-destructive/10 p-3">
                <AlertCircle className="size-7 text-destructive" />
              </span>
              <h2 className="text-xl font-semibold">We couldn’t open this form</h2>
              <p role="alert" className="text-sm leading-6 text-muted-foreground">
                Check that you have the complete link, or contact the person who shared it.
              </p>
              <Button variant="outline" onClick={() => void refetch()}>
                <RotateCcw className="size-4" />
                Try again
              </Button>
            </div>
          ) : submitted ? (
            <div role="status" className="flex min-h-96 flex-col items-start justify-center gap-5">
              <span className="rounded-full bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-950">
                <CheckCircle2 className="size-9" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Response received
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Thank you for being part of it.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                Your response to{" "}
                <strong className="font-medium text-foreground">{form.title}</strong> has been
                submitted successfully. You can close this page.
              </p>
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <Check className="size-4" />
                Successfully submitted
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-7">
              <div className="border-b pb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your response
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Let’s get started.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Fields marked <span className="font-medium text-destructive">*</span> are
                  required. Take your time and review your answers before sending.
                </p>
              </div>
              <div className="[&>div]:space-y-6">
                <FormFieldsRenderer fields={form.fields} onChange={setAnswers} disabled={sending} />
              </div>
              <SubmissionAttachments onChange={setAssetIds} disabled={sending} />
              {failure && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm leading-6 text-destructive"
                >
                  <AlertCircle className="mt-1 size-4 shrink-0" />
                  {failure}
                </div>
              )}
              <div className="border-t pt-6">
                <BotProtection path={`/forms/public/${token}/submit`} />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl bg-[var(--brand)] text-white transition hover:brightness-110"
                  disabled={sending || !captchaReady}
                >
                  {sending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending response…
                    </>
                  ) : (
                    <>
                      Send response
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs leading-6 text-muted-foreground">
                  Review your details before sending your response.
                </p>
              </div>
            </form>
          )}
        </section>
      </main>
      <footer className="pb-7 text-center text-xs text-muted-foreground">
        Made for your community · Powered by ChurchOS
      </footer>
    </div>
  );
}
