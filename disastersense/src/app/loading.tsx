/** Route-transition loading UI. */
export default function Loading() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-base px-4"
    >
      <div className="flex items-center gap-2 text-xs text-muted" role="status" aria-live="polite">
        <span className="h-3 w-3 animate-pulse-soft rounded-full bg-accent" aria-hidden />
        Loading control room…
      </div>
    </main>
  );
}
