import { cn } from "@/lib/utils";

/** Geometric "D" built from an AI-node lattice. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M10 8h6.5a8 8 0 0 1 0 16H10z" fill="none" strokeWidth="2.2" strokeLinejoin="round" className="stroke-primary-foreground" />
      <path d="M10 16h7.5" strokeWidth="1.4" className="stroke-gold" />
      <circle cx="10" cy="8" r="2" className="fill-gold" />
      <circle cx="10" cy="24" r="2" className="fill-gold" />
      <circle cx="18" cy="16" r="2.1" className="fill-gold" />
    </svg>
  );
}

export function Wordmark({ collapsed, subtitle = true }: { collapsed?: boolean; subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[17px] font-semibold tracking-tight">
            Dex<span className="text-gold-text">-</span>Ai
          </div>
          {subtitle && <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Intelligent Homelab Control</div>}
        </div>
      )}
    </div>
  );
}
