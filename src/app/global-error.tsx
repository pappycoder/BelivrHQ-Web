"use client";

import { retryPage } from "@/lib/retry-page";
import * as React from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-2xl">
            ⚠️
          </div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            An unexpected error occurred. We have been notified and are looking
            into it. Please try again.
          </p>
          <button
            onClick={() => void retryPage()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
