"use client";

/**
 * Last-resort boundary for errors thrown by the root layout itself. It replaces
 * the root layout, so it must render its own <html>/<body> and cannot rely on
 * the app stylesheet — styles are inlined.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const body: React.CSSProperties = {
    minHeight: "100vh",
    margin: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b0e14",
    color: "#e6eaf2",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
    padding: "24px",
  };
  const card: React.CSSProperties = {
    background: "#121722",
    border: "1px solid #232c3d",
    borderRadius: 14,
    padding: "24px",
    maxWidth: 460,
  };
  const button: React.CSSProperties = {
    background: "#38bdf8",
    color: "#0b0e14",
    border: "none",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <html lang="en">
      <body style={body}>
        <div style={card}>
          <h1 style={{ margin: "0 0 8px", fontSize: 18 }}>Application error</h1>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
            DisasterSense failed to start this view. Reload to try again. This is a
            decision-support prototype and does not dispatch real emergency services.
          </p>
          {error.digest ? (
            <p style={{ margin: "0 0 16px", fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button type="button" style={button} onClick={reset}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
