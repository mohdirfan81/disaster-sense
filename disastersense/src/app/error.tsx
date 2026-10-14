"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card, CardHeader } from "@/components/ui";

/**
 * Route-level error boundary. Catches render/data errors in the app tree so a
 * single failing view never blanks the whole control room.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-base px-4 py-6"
    >
      <Card className="w-full max-w-lg">
        <CardHeader
          title="Something went wrong"
          subtitle="The control room hit an unexpected error."
        />
        <div className="space-y-4 p-4">
          <p className="text-xs leading-relaxed text-muted">
            You can retry this view. If the problem persists, reload the page. This is a
            decision-support prototype, and no real dispatch was affected.
          </p>
          {error.digest ? (
            <p className="font-mono text-[11px] text-faint">Reference: {error.digest}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-sm border border-line bg-raised px-3 py-1.5 text-xs text-ink transition-colors hover:bg-panel"
            >
              Back to control room
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
