import { Check, Circle, FileText, FolderGit2, X } from "lucide-react";
import type { CodexStep, CodexTask } from "@/api/types";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function StepList({ steps }: { steps: CodexStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((s) => (
        <li key={s.label} className={cn("flex items-center gap-2 text-sm", s.state === "pending" && "text-muted-foreground")}>
          {s.state === "done" && <Check className="size-3.5 text-success" />}
          {s.state === "active" && <span className="grid size-3.5 place-items-center"><span className="size-2 rounded-full bg-gold live-dot" /></span>}
          {s.state === "pending" && <Circle className="size-3.5" />}
          {s.state === "error" && <X className="size-3.5 text-primary-accent" />}
          <span className={cn(s.state === "active" && "font-medium")}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function CodexTaskCard({ task, onLogs, onCancel }: { task: CodexTask; onLogs: () => void; onCancel?: () => void }) {
  const active = task.status === "running" || task.status === "queued";
  return (
    <article className={cn("dex-card relative overflow-hidden p-5", task.status === "running" && "border-gold/50")}>
      {task.status === "running" && <div className="absolute inset-x-0 top-0 h-0.5 bg-gold" />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{task.project}</div>
          <h3 className="mt-1 text-base font-semibold">{task.title}</h3>
        </div>
        <StatusBadge status={task.status} className="uppercase tracking-wider" />
      </div>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Repository</dt><dd className="mt-0.5 flex items-center gap-1 truncate font-mono"><FolderGit2 className="size-3 shrink-0 text-gold-text" />{task.repository}</dd></div>
        <div><dt className="text-muted-foreground">Started</dt><dd className="mt-0.5 font-medium">{timeAgo(task.startedAt)}</dd></div>
        <div><dt className="text-muted-foreground">Current step</dt><dd className="mt-0.5 font-medium">{task.currentStep ?? (task.status === "queued" ? "Waiting for runner" : "—")}</dd></div>
      </dl>
      <div className="mt-4 rounded-lg border bg-muted/40 p-3"><StepList steps={task.steps} /></div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" onClick={onLogs}><FileText className="size-3.5" />View logs</Button>
        {active && onCancel && <Button size="sm" variant="ghost" className="text-primary-accent hover:text-primary-accent" onClick={onCancel}><X className="size-3.5" />Cancel</Button>}
      </div>
    </article>
  );
}
