import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTasks } from "@/api/hooks";
import type { CodexTask } from "@/api/types";
import { CodexTaskCard } from "@/components/dex/CodexTaskCard";
import {
  EmptyState,
  ErrorState,
  LoadingGrid,
  PageHeader,
  Panel,
} from "@/components/dex/primitives";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/codex/tasks")({
  head: () => seo("Codex Tasks", "Dex-Ai Codex Tasks — Running and past Codex development tasks."),
  component: CodexTasksPage,
});

function CodexTasksPage() {
  const query = useTasks();
  const [selected, setSelected] = useState<CodexTask | null>(null);
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow="Codex"
        title="Codex Tasks"
        description="Running and past Codex development tasks."
      />
      {!query.data ? (
        <LoadingGrid />
      ) : query.data.length === 0 ? (
        <Panel>
          <EmptyState
            title="No Codex tasks"
            description="No development tasks have been submitted to the Dex-Ai task registry."
          />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {query.data.map((task) => (
            <CodexTaskCard key={task.id} task={task} onLogs={() => setSelected(task)} />
          ))}
        </div>
      )}
      {selected && (
        <Panel title={`${selected.title} logs`} className="mt-6">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-xs">
            {selected.log.length ? selected.log.join("\n") : "No logs recorded."}
          </pre>
          <button
            className="mt-3 text-xs font-medium text-gold-text"
            onClick={() => setSelected(null)}
          >
            Close logs
          </button>
        </Panel>
      )}
    </>
  );
}
