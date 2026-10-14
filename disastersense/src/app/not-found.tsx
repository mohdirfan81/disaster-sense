import Link from "next/link";

/** 404 view for unknown routes. */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-base px-4 text-center"
    >
      <p className="font-mono text-xs text-faint">404</p>
      <h1 className="text-lg font-bold tracking-tight text-ink">Page not found</h1>
      <p className="max-w-sm text-xs leading-relaxed text-muted">
        The control-room view you requested does not exist or is no longer available.
      </p>
      <Link
        href="/"
        className="mt-1 inline-flex items-center rounded-sm border border-line bg-raised px-3 py-1.5 text-xs text-ink transition-colors hover:bg-panel"
      >
        Back to control room
      </Link>
    </main>
  );
}
