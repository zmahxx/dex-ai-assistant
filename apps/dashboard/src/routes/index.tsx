import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bot, Boxes, Home, Server, ArrowRight } from "lucide-react";
import {
  useContainers,
  useEvents,
  useHomeStatus,
  useServices,
  useSystem,
  useTasks,
} from "@/api/hooks";
import {
  PageHeader,
  MetricCard,
  ResourceGauge,
  LoadingGrid,
  Panel,
  ErrorState,
} from "@/components/dex/primitives";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { PerformanceChart } from "@/components/dex/PerformanceChart";
import { ServicesTable } from "@/components/dex/ServicesTable";
import { EventFeed } from "@/components/dex/EventFeed";
import { uptime } from "@/lib/format";
import { seo } from "@/lib/seo";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "Overview",
      "Live command center for the Dex-Ai homelab: server health, Docker, Home Assistant and Codex.",
    ),
  component: Overview,
});

function Overview() {
  const sys = useSystem();
  const home = useHomeStatus();
  const docker = useContainers();
  const services = useServices();
  const tasks = useTasks();
  const events = useEvents();
  const navigate = useNavigate();

  const s = sys.data;
  const running = docker.data?.filter((c) => c.status === "running").length ?? 0;
  const unhealthy = docker.data?.filter((c) => c.status === "unhealthy").length ?? 0;
  const activeTasks =
    tasks.data?.filter((t) => t.status === "running" || t.status === "queued").length ?? 0;
  const trend = (k: "cpu" | "ram" | "temp") => s?.history.slice(-24).map((p) => p[k]) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={s ? `${s.hostname} · up ${uptime(s.uptimeSeconds)}` : "Command center"}
        title="Good afternoon, Zane"
      />

      {sys.isError ? (
        <ErrorState error={sys.error} onRetry={() => sys.refetch()} />
      ) : !s || !home.data || !docker.data || !tasks.data ? (
        <LoadingGrid />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Server}
            label="Server"
            value={`${Math.round(s.cpu)}% CPU`}
            status={<StatusBadge status="online" />}
            onClick={() => navigate({ to: "/system" })}
            lines={[
              { k: "Host", v: s.hostname },
              { k: "Uptime", v: uptime(s.uptimeSeconds) },
            ]}
          />
          <MetricCard
            icon={Home}
            label="Home Assistant"
            value={`${home.data.totalEntities} entities`}
            status={<StatusBadge status="connected" />}
            onClick={() => navigate({ to: "/home" })}
            lines={[
              { k: "Unavailable", v: home.data.unavailable },
              { k: "Lights on", v: home.data.lightsOn },
            ]}
          />
          <MetricCard
            icon={Boxes}
            label="Docker"
            value={`${running} / ${docker.data.length} running`}
            status={
              <StatusBadge
                status={unhealthy ? "unhealthy" : "running"}
                label={unhealthy ? `${unhealthy} unhealthy` : "Healthy"}
              />
            }
            onClick={() => navigate({ to: "/docker" })}
            lines={[
              { k: "Stopped", v: docker.data.length - running },
              { k: "Unhealthy", v: unhealthy },
            ]}
          />
          <MetricCard
            icon={Bot}
            label="Dex-Ai"
            value={`${s.apiLatencyMs} ms`}
            status={<StatusBadge status="online" />}
            onClick={() => navigate({ to: "/codex/tasks" })}
            lines={[
              { k: "API latency", v: `${s.apiLatencyMs} ms` },
              { k: "Active tasks", v: activeTasks },
            ]}
          />
        </div>
      )}

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="eyebrow">System health</h2>
      </div>
      {!s ? (
        <LoadingGrid h="h-44" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResourceGauge
            label="CPU"
            value={`${Math.round(s.cpu)}%`}
            percent={s.cpu}
            trend={trend("cpu")}
          />
          <ResourceGauge
            label="RAM"
            value={`${s.ramUsedGb} GB`}
            detail={`/ ${s.ramTotalGb} GB`}
            percent={(s.ramUsedGb / s.ramTotalGb) * 100}
            trend={trend("ram")}
          />
          <ResourceGauge
            label="Disk"
            value={`${s.diskUsedTb} TB`}
            detail={`/ ${s.diskTotalTb} TB`}
            percent={(s.diskUsedTb / s.diskTotalTb) * 100}
            trend={Array(24).fill(65)}
            warnAt={80}
          />
          <ResourceGauge
            label="Temperature"
            value={`${s.tempC}°C`}
            percent={(s.tempC / 90) * 100}
            trend={trend("temp")}
            warnAt={78}
            badAt={88}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {s ? <PerformanceChart history={s.history} /> : <Skeleton className="h-80 rounded-xl" />}
          {services.data ? (
            <ServicesTable services={services.data} />
          ) : (
            <Skeleton className="h-72 rounded-xl" />
          )}
        </div>
        <Panel
          title="Recent activity"
          action={
            <Link
              to="/events"
              className="flex items-center gap-1 text-xs font-medium text-gold-text hover:underline"
            >
              All events
              <ArrowRight className="size-3" />
            </Link>
          }
          bodyClassName="py-2"
        >
          {events.data ? (
            <EventFeed events={events.data} limit={9} />
          ) : (
            <div className="space-y-3 py-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
