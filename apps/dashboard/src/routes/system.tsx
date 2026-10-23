import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Database, HardDrive, Thermometer } from "lucide-react";
import { useSystem } from "@/api/hooks";
import {
  ErrorState,
  LoadingGrid,
  PageHeader,
  Panel,
  ResourceGauge,
} from "@/components/dex/primitives";
import { uptime } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/system")({
  head: () => seo("System", "Dex-Ai System — CPU, memory, disk and temperature details."),
  component: SystemPage,
});

function SystemPage() {
  const query = useSystem();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const system = query.data;
  const trend = (key: "cpu" | "ram" | "temp") =>
    system?.history.slice(-24).map((point) => point[key]) ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Infrastructure"
        title="System"
        description="CPU, memory, disk and temperature details."
      />
      {!system ? (
        <LoadingGrid />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ResourceGauge
              label="CPU"
              value={`${Math.round(system.cpu)}%`}
              percent={system.cpu}
              trend={trend("cpu")}
            />
            <ResourceGauge
              label="Memory"
              value={`${system.ramUsedGb} GB`}
              detail={`/ ${system.ramTotalGb} GB`}
              percent={(system.ramUsedGb / system.ramTotalGb) * 100}
              trend={trend("ram")}
            />
            <ResourceGauge
              label="Disk"
              value={`${system.diskUsedTb} TB`}
              detail={`/ ${system.diskTotalTb} TB`}
              percent={(system.diskUsedTb / system.diskTotalTb) * 100}
              trend={[]}
              warnAt={80}
            />
            <ResourceGauge
              label="Temperature"
              value={system.tempC ? `${system.tempC}°C` : "Unavailable"}
              percent={system.tempC ? (system.tempC / 90) * 100 : 0}
              trend={trend("temp")}
              warnAt={78}
              badAt={88}
            />
          </div>
          <Panel title="Host details" className="mt-6">
            <dl className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                [Cpu, "Hostname", system.hostname],
                [Database, "Uptime", uptime(system.uptimeSeconds)],
                [HardDrive, "API latency", `${system.apiLatencyMs} ms`],
                [Thermometer, "Telemetry", "Live every 5 seconds"],
              ].map(([Icon, label, value]) => {
                const Glyph = Icon as typeof Cpu;
                return (
                  <div key={String(label)}>
                    <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Glyph className="size-3.5 text-gold-text" />
                      {String(label)}
                    </dt>
                    <dd className="mt-1 font-medium">{String(value)}</dd>
                  </div>
                );
              })}
            </dl>
          </Panel>
        </>
      )}
    </>
  );
}
