import { Fragment, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, FileText, Play, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { qk, useContainers, useDexMutation } from "@/api/hooks";
import type { DockerContainer } from "@/api/types";
import { PageHeader, Panel, LoadingGrid, ErrorState } from "@/components/dex/primitives";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { ConfirmationDialog } from "@/components/dex/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/docker")({
  head: () => seo("Docker", "Monitor and control every container on the Dex-Ai homelab."),
  component: DockerPage,
});

type Action = "start" | "stop" | "restart";

function DockerPage() {
  const { data, isError, error, refetch } = useContainers();
  const [open, setOpen] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [logsLoading, setLogsLoading] = useState<string | null>(null);
  const [pending, setPending] = useState<{ c: DockerContainer; action: Action } | null>(null);
  const m = useDexMutation(api.containerAction, [qk.containers, qk.services]);

  const run = () => {
    if (!pending) return;
    const { c, action } = pending;
    m.mutate([c.id, action], {
      onSuccess: () => toast.success(`${c.name}: ${action} complete`),
      onError: (e) => toast.error((e as Error).message),
    });
    setPending(null);
  };

  const toggleOpen = (container: DockerContainer) => {
    if (open === container.id) {
      setOpen(null);
      return;
    }
    setOpen(container.id);
    if (logs[container.id]) return;
    setLogsLoading(container.id);
    void api
      .containerLogs(container.id)
      .then((lines) => setLogs((current) => ({ ...current, [container.id]: lines })))
      .catch((logError) => toast.error((logError as Error).message))
      .finally(() => setLogsLoading(null));
  };

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  const counts = data && {
    Running: data.filter((c) => c.status === "running").length,
    Stopped: data.filter((c) => c.status === "stopped").length,
    Unhealthy: data.filter((c) => c.status === "unhealthy").length,
    Total: data.length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Infrastructure"
        title="Docker"
        description="Containers on dex-homelab. Actions require confirmation."
      />
      {!counts ? (
        <LoadingGrid h="h-20" />
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="dex-card p-4">
              <div className="eyebrow">{k}</div>
              <div
                className={cn(
                  "mt-2 text-2xl font-semibold tabular",
                  k === "Unhealthy" && v > 0 && "text-primary-accent",
                )}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      )}
      <Panel title="Containers" className="mt-6" bodyClassName="p-0">
        {!data ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  {["", "Name", "Image", "Status", "CPU", "RAM", "Uptime", "Ports", ""].map(
                    (h, i) => (
                      <th key={i} className="eyebrow px-4 py-2.5 !text-[10px]">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((c) => {
                  const isOpen = open === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        className={cn(
                          "cursor-pointer border-b transition-colors hover:bg-muted/50",
                          isOpen && "bg-muted/40",
                        )}
                        onClick={() => toggleOpen(c)}
                      >
                        <td className="w-8 pl-4">
                          <ChevronRight
                            className={cn(
                              "size-4 text-muted-foreground transition-transform",
                              isOpen && "rotate-90 text-gold-text",
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                          {c.image}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3 tabular">
                          {c.cpu === null ? "—" : `${c.cpu.toFixed(1)}%`}
                        </td>
                        <td className="px-4 py-3 tabular">
                          {c.ramMb === null
                            ? "—"
                            : c.ramMb >= 1024
                              ? `${(c.ramMb / 1024).toFixed(1)} GB`
                              : `${c.ramMb} MB`}
                        </td>
                        <td className="px-4 py-3 tabular text-muted-foreground">{c.uptime}</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.ports.join(", ") || "—"}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {c.status === "stopped" ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Start"
                                onClick={() => setPending({ c, action: "start" })}
                              >
                                <Play className="size-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Stop"
                                onClick={() => setPending({ c, action: "stop" })}
                              >
                                <Square className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Restart"
                              onClick={() => setPending({ c, action: "restart" })}
                            >
                              <RotateCw className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Logs"
                              onClick={() => toggleOpen(c)}
                            >
                              <FileText className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b bg-muted/30">
                          <td colSpan={9} className="px-6 py-5">
                            <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                              <div>
                                <div className="eyebrow mb-2">Recent logs</div>
                                <pre className="max-h-48 overflow-auto rounded-lg border bg-card p-3 font-mono text-xs leading-relaxed">
                                  {logsLoading === c.id
                                    ? "Loading logs…"
                                    : logs[c.id]?.length
                                      ? logs[c.id]?.join("\n")
                                      : "No recent container logs."}
                                </pre>
                              </div>
                              <dl className="space-y-3 text-xs">
                                <div>
                                  <dt className="eyebrow !text-[10px]">Restart count</dt>
                                  <dd className="mt-0.5 text-sm font-medium tabular">
                                    {c.restartCount ?? "—"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="eyebrow !text-[10px]">Networks</dt>
                                  <dd className="mt-0.5 font-mono">
                                    {c.networks.join(", ") || "—"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="eyebrow !text-[10px]">Volumes</dt>
                                  <dd className="mt-0.5 font-mono break-all">
                                    {c.volumes.join(", ") || "—"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="eyebrow !text-[10px]">Environment</dt>
                                  <dd className="mt-0.5 font-mono">
                                    {Object.entries(c.env)
                                      .map(([k, v]) => `${k}=${v}`)
                                      .join("  ") || "—"}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <ConfirmationDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending
            ? `${pending.action.charAt(0).toUpperCase()}${pending.action.slice(1)} ${pending.c.name}?`
            : ""
        }
        description={
          pending?.action === "stop"
            ? "Services relying on this container will become unavailable."
            : "Dex-Ai will send this action to the Docker host."
        }
        confirmLabel={pending?.action ?? "Confirm"}
        destructive={pending?.action === "stop"}
        onConfirm={run}
      />
    </>
  );
}
