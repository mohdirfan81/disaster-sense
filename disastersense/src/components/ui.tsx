import { cn } from "@/lib/format";
import type { ReactNode } from "react";

export { cn };

/** Small shared UI primitives for the dark control-room theme. */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-line bg-panel shadow-panel", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants: Record<string, string> = {
    default: "border border-line bg-raised text-ink hover:bg-panel rounded-full",
    primary: "bg-accent text-white font-medium hover:bg-accent/90 shadow-sm rounded-full",
    danger: "bg-critical text-white font-semibold hover:bg-critical/85 shadow-glow",
    ghost: "text-muted hover:text-ink hover:bg-raised rounded-full",
    secondary: "bg-accent-soft text-accent font-medium hover:bg-accent/15 border border-accent/20 rounded-full",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-5 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <p className="text-sm font-medium text-muted">{title}</p>
      {hint ? <p className="mt-1 max-w-xs text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
