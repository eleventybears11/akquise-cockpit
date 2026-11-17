import type { ButtonHTMLAttributes, ReactNode } from "react";
import { isOpen, toUrl } from "../lib/normalize";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "bg-surface border border-line text-ink hover:bg-surface-2",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-surface border border-line text-danger hover:bg-danger-soft",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Zeigt „offen“ deutlich als fehlende Angabe an. */
export function Val({ v, className = "" }: { v: string | undefined; className?: string }) {
  if (isOpen(v)) return <span className={`text-muted italic ${className}`}>offen</span>;
  return <span className={className}>{v}</span>;
}

function shortUrl(value: string): string {
  const s = value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return s.length > 38 ? `${s.slice(0, 36)}…` : s;
}

export function ExtLink({ value, className = "" }: { value: string; className?: string }) {
  const url = toUrl(value);
  if (!url) return <Val v={value} className={className} />;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" title={url} className={`text-accent hover:underline break-all ${className}`}>
      {shortUrl(value)}
    </a>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "ok" | "warn" | "danger" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) return <span className="text-muted">–</span>;
  const tone = score >= 8 ? "ok" : score >= 6 ? "accent" : "neutral";
  return <Badge tone={tone}>{score}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-muted">{children}</div>;
}

export function downloadFile(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
