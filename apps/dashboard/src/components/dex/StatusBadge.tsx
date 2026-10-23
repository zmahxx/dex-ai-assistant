import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap",
  {
    variants: {
      tone: {
        ok: "border-success/25 bg-success/10 text-success",
        gold: "border-gold/40 bg-gold/10 text-gold-text",
        warn: "border-warning/30 bg-warning/10 text-warning",
        bad: "border-primary-accent/30 bg-primary-accent/10 text-primary-accent",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const toneFor: Record<string, VariantProps<typeof badge>["tone"]> = {
  online: "ok", running: "ok", connected: "ok", success: "ok", completed: "ok", passing: "ok", clean: "ok", live: "ok", on: "ok",
  info: "gold", queued: "gold", active: "gold", ahead: "gold", normal: "gold",
  degraded: "warn", warning: "warn", restarting: "warn", dirty: "warn", elevated: "warn",
  offline: "bad", failed: "bad", critical: "bad", unhealthy: "bad", failing: "bad", high: "bad",
  stopped: "neutral", unknown: "neutral", cancelled: "neutral", off: "neutral",
};

export function StatusBadge({ status, label, className, dot = true }: { status: string; label?: string; className?: string; dot?: boolean }) {
  const tone = toneFor[status.toLowerCase()] ?? "neutral";
  return (
    <span className={cn(badge({ tone }), className)}>
      {dot && <span className={cn("size-1.5 rounded-full bg-current", (status === "running" || status === "live") && "live-dot")} />}
      {label ?? status}
    </span>
  );
}
