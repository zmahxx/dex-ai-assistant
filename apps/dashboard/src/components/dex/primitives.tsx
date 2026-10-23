import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-1.5 flex items-center gap-2"><span className="h-px w-4 bg-gold" />{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClassName }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("dex-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({ icon: Icon, label, value, status, lines, onClick }: {
  icon: LucideIcon; label: string; value: ReactNode; status?: ReactNode; lines?: { k: string; v: ReactNode }[]; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={cn("dex-card p-4", onClick && "dex-card-hover cursor-pointer")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold-text"><Icon className="size-4" /></div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {status}
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight tabular">{value}</div>
      {lines && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {lines.map((l) => (
            <div key={l.k} className="contents">
              <dt className="text-muted-foreground">{l.k}</dt>
              <dd className="text-right font-medium tabular">{l.v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function MiniSparkline({ data, danger, height = 36 }: { data: number[]; danger?: boolean; height?: number }) {
  const id = danger ? "spark-red" : "spark-gold";
  const color = danger ? "var(--color-primary-accent)" : "var(--color-gold)";
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <AreaChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area dataKey="v" type="monotone" stroke={color} strokeWidth={1.6} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ResourceGauge({ label, value, detail, percent, trend, warnAt = 75, badAt = 90 }: {
  label: string; value: string; detail?: string; percent: number; trend: number[]; warnAt?: number; badAt?: number;
}) {
  const state = percent >= badAt ? "high" : percent >= warnAt ? "elevated" : "normal";
  const danger = state !== "normal";
  return (
    <div className="dex-card p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider", danger ? "text-primary-accent" : "text-gold-text")}>{state === "normal" ? "Normal" : state === "elevated" ? "Elevated" : "High"}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular">{value}</span>
        {detail && <span className="text-xs text-muted-foreground tabular">{detail}</span>}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-700", danger ? "bg-primary-accent" : "bg-gold")} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="mt-3"><MiniSparkline data={trend} danger={danger} /></div>
    </div>
  );
}

export function LoadingGrid({ count = 4, className, h = "h-32" }: { count?: number; className?: string; h?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={cn("rounded-xl", h)} />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description }: { icon?: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold-text"><Icon className="size-5" /></div>
      <div className="mt-3 text-sm font-medium">{title}</div>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="dex-card flex flex-col items-center gap-3 border-primary-accent/30 p-8 text-center">
      <AlertTriangle className="size-6 text-primary-accent" />
      <div className="text-sm font-medium">Couldn't reach Dex-Ai</div>
      <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RotateCw className="size-3.5" />Retry</Button>}
    </div>
  );
}

export function SegmentedControl<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-muted p-0.5">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === o ? "bg-card text-foreground shadow-card ring-1 ring-gold/40" : "text-muted-foreground hover:text-foreground")}>
          {o}
        </button>
      ))}
    </div>
  );
}
