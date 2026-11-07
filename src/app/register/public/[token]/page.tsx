"use client";
import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getToastErrorMessage } from "@/lib/toast";
import type { FormField } from "@/hooks/use-forms";
import { ChurchFormBranding } from "@/components/forms/church-form-branding";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";
import { Button } from "@/components/ui/button";
interface IntakeMeta {
  title: string;
  churchName: string;
  churchLogoUrl?: string | null;
  branchName: string;
  fields: FormField[];
}
export default function PublicRegistrationPage() {
  const { token } = useParams<{ token: string }>();
  return <Registration key={token} token={token} />;
}
function Registration({ token }: { token: string }) {
  const path = `/intake/public/${encodeURIComponent(token)}/submit`;
  const ready = useBotProtectionReady(path);
  const form = useQuery({
    queryKey: ["public-intake", token],
    retry: false,
    queryFn: ({ signal }) =>
      api.get<IntakeMeta>(`/intake/public/${encodeURIComponent(token)}/meta`, {
        skipAuth: true,
        signal,
      }),
  });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.data || sending || !ready) return;
    const missing = form.data.fields.filter(
      (f) =>
        f.required &&
        (answers[f.key] === undefined ||
          answers[f.key] === "" ||
          (Array.isArray(answers[f.key]) &&
            !(answers[f.key] as unknown[]).length)),
    );
    if (missing.length) {
      setError(`Please complete: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setError("");
    setSending(true);
    try {
      await api.post(path, { data: answers }, { skipAuth: true });
      setSent(true);
    } catch (err) {
      setError(
        getToastErrorMessage(
          err,
          "Could not send your registration. Your answers are preserved; please retry.",
        ),
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <main
      data-paper-root
      className="min-h-svh bg-background px-4 py-8 text-foreground sm:py-12"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {form.isLoading ? (
          <p role="status">Loading registration form…</p>
        ) : form.isError || !form.data ? (
          <div className="paper-card space-y-3 rounded-2xl p-6">
            <h1 className="text-2xl font-semibold">Registration unavailable</h1>
            <p>
              This link may be unavailable. Please contact the church or try
              again.
            </p>
            <Button variant="outline" onClick={() => void form.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <ChurchFormBranding
              churchName={form.data.churchName}
              churchLogoUrl={form.data.churchLogoUrl}
            />
            <section className="paper-card space-y-5 rounded-2xl p-5 sm:p-8">
              <header className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {form.data.branchName}
                </p>
                <h1 className="text-2xl font-semibold">{form.data.title}</h1>
                <p className="text-sm text-muted-foreground">
                  No sign-in needed. Fields marked * are required.
                </p>
              </header>
              {sent ? (
                <div role="status" className="space-y-2">
                  <h2 className="text-xl font-semibold">
                    Registration received
                  </h2>
                  <p>
                    Thank you. The church team will review your registration
                    before adding it to their records.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <FormFieldsRenderer
                    fields={form.data.fields}
                    disabled={sending}
                    onChange={setAnswers}
                    showOptional
                  />
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <BotProtection path={path} />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!ready || sending}
                  >
                    {sending ? "Sending…" : "Send registration"}
                  </Button>
                </form>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
