import { Bot, Boxes, Code2, Home, Server } from "lucide-react";
import type { DexEvent, EventSource } from "@/api/types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./primitives";

export const sourceMeta: Record<EventSource, { label: string; icon: typeof Bot }> = {
  system: { label: "System", icon: Server },
  docker: { label: "Docker", icon: Boxes },
  home: { label: "Home Assistant", icon: Home },
  codex: { label: "Codex", icon: Code2 },
  dexai: { label: "Dex-Ai", icon: Bot },
};

export function EventFeed({ events, limit }: { events: DexEvent[]; limit?: number }) {
  const list = events.slice(0, limit);
  if (!list.length) return <EmptyState title="No activity yet" description="Events from your homelab will appear here." />;
  return (
    <ol className="relative space-y-0">
      {list.map((e) => {
        const M = sourceMeta[e.source];
        return (
          <li key={e.id} className="flex gap-3 py-2.5">
            <div className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border",
              e.severity === "critical" ? "border-primary-accent/30 bg-primary-accent/10 text-primary-accent" : "border-gold/30 bg-gold/10 text-gold-text")}>
              <M.icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow !text-[10px]">{M.label}</span>
                <span className="text-[11px] text-muted-foreground tabular">{timeAgo(e.timestamp)}</span>
              </div>
              <div className="truncate text-sm font-medium">{e.title}</div>
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-xs text-muted-foreground">{e.description}</div>
                {e.severity !== "info" && <StatusBadge status={e.severity} dot={false} className="!text-[10px]" />}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
