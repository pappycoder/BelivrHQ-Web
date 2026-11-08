"use client";
import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getToastErrorMessage } from "@/lib/toast";
import type { FormField } from "@/hooks/use-forms";
import {
  PublicFormFrame,
  PublicFormLoading,
} from "@/components/forms/public-form-frame";
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
  const [validateFields, setValidateFields] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.data || sending || !ready) return;
    setValidateFields(true);
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
  if (form.isLoading) return <PublicFormLoading />;
  if (form.isError || !form.data)
    return (
      <PublicFormFrame
        title="Registration unavailable"
        description="Please contact the church or try again with the link they shared."
      >
        <div className="flex min-h-72 flex-col items-start justify-center gap-4">
          <h2 className="text-xl font-semibold">We couldn’t open this form</h2>
          <p role="alert" className="text-sm leading-6 text-muted-foreground">
            This registration link may be unavailable.
          </p>
          <Button variant="outline" onClick={() => void form.refetch()}>
            Try again
          </Button>
        </div>
      </PublicFormFrame>
    );
  return (
    <PublicFormFrame
      churchName={form.data.churchName}
      churchLogoUrl={form.data.churchLogoUrl}
      eyebrow={form.data.branchName}
      title={form.data.title}
      description="Share your details with the church team. They will review your registration before adding it to their records."
      aside={
        <div className="mt-7 flex flex-wrap gap-2 text-xs">
          {[
            `${form.data.fields.length} questions`,
            `${form.data.fields.filter((field) => field.required).length} required`,
            "No sign-in needed",
          ].map((text) => (
            <span
              key={text}
              className="rounded-full border border-white/15 px-3 py-2"
            >
              {text}
            </span>
          ))}
        </div>
      }
    >
      {sent ? (
        <div
          role="status"
          className="flex min-h-72 flex-col justify-center gap-3"
        >
          <h2 className="text-2xl font-semibold">Registration received</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Thank you. The church team will review your registration before
            adding it to their records.
          </p>
        </div>
      ) : (
        <>
          <header className="mb-7 space-y-3 border-b pb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your registration
            </p>
            <h2 className="text-2xl font-semibold">Let’s get started.</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Fields marked * are required. Take your time before sending.
            </p>
          </header>
          <form onSubmit={submit} className="space-y-7">
            <FormFieldsRenderer
              validateRequired={validateFields}
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
            <div className="space-y-4 border-t pt-6">
              <BotProtection path={path} />
              <Button
                type="submit"
                className="w-full"
                disabled={!ready || sending}
              >
                {sending ? "Sending…" : "Send registration"}
              </Button>
            </div>
          </form>
        </>
      )}
    </PublicFormFrame>
  );
}
