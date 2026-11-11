"use client";

import { LoadingState } from "@/components/shared/loading-state";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSupportChat } from "./support-chat-provider";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { SUPPORT_NAME } from "@/lib/support";

export function SupportContact({
  presentation = "public",
}: {
  presentation?: "public" | "workspace";
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { available, openChat } = useSupportChat();
  return (
    <div
      className={
        presentation === "workspace" ? "max-w-3xl space-y-4" : "space-y-8"
      }
    >
      <header className="space-y-4">
        <BrandLogo variant="mark" emblemClassName="!size-10" />
        <p className="text-sm font-semibold tracking-widest text-primary">
          HERE TO HELP
        </p>
        <h1
          className={
            presentation === "workspace"
              ? "text-2xl font-semibold tracking-tight"
              : "text-3xl font-semibold tracking-tight sm:text-4xl"
          }
        >
          Contact {SUPPORT_NAME}
        </h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          Church administrators can use the in-app chat to get help with
          BelivrHQ or report a problem.
        </p>
      </header>
      <section
        aria-labelledby="chat-title"
        className={
          presentation === "workspace"
            ? "rounded-xl border bg-card p-4"
            : "rounded-2xl border bg-accent/30 p-5 sm:p-7"
        }
      >
        <h2
          id="chat-title"
          className={
            presentation === "workspace"
              ? "flex items-center gap-2 text-sm font-semibold"
              : "flex items-center gap-2 text-xl font-semibold"
          }
        >
          <MessageCircle className="size-5 text-primary" />
          Administrator live chat
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Use the floating chat bubble for a quick question. If the team is
          offline, leave a message and a reply email in the widget.
        </p>
        <div className="mt-4">
          {available ? (
            <Button variant="outline" onClick={openChat}>
              Open support chat
            </Button>
          ) : isLoading ? (
            <LoadingState label="Checking chat availability" variant="inline" className="h-9" />
          ) : !isAuthenticated ? (
            <Button asChild variant="outline">
              <Link href="/login?returnTo=%2Fhelp%2Fcontact-support">
                Sign in to chat
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Live chat is available to active church administrators. Ask your
              church administrator to contact BelivrHQ Support on your behalf.
            </p>
          )}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          For a new chat session, open the widget menu and choose “End this chat
          session”, then start another chat. Previous conversation history may
          remain visible.
        </p>
      </section>
      <aside className="rounded-xl border p-5 text-sm leading-relaxed text-muted-foreground">
        Your church administrator manages role assignments, location access and
        church settings. BelivrHQ Support can help investigate product issues;
        contacting support does not change your account permissions.
      </aside>
    </div>
  );
}
