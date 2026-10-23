import { useState } from "react";
import { Search } from "lucide-react";
import type { Service } from "@/api/types";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, Panel } from "./primitives";

export function ServicesTable({ services, title = "Services", limit }: { services: Service[]; title?: string; limit?: number }) {
  const [q, setQ] = useState("");
  const rows = services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, limit);
  return (
    <Panel title={title} bodyClassName="p-0"
      action={<div className="relative w-44"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter services" className="h-8 pl-8 text-xs" /></div>}>
      {rows.length === 0 ? <EmptyState title="No matching services" /> : (
        <ul className="divide-y">
          {rows.map((s) => (
            <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.9fr]">
              <div className="font-medium text-sm">{s.name}</div>
              <div className="sm:order-none"><StatusBadge status={s.status} /></div>
              <div className="hidden text-xs text-muted-foreground tabular sm:block">up {s.uptime}</div>
              <div className="hidden text-xs text-muted-foreground tabular sm:block">{s.port ? `:${s.port}` : "—"}</div>
              <div className="hidden text-right text-xs font-medium tabular sm:block">{s.responseMs != null ? `${s.responseMs} ms` : "—"}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
