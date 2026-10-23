import { createFileRoute } from "@tanstack/react-router";
import { Activity, Home, Lightbulb, Radio } from "lucide-react";
import { useEntities, useHomeStatus } from "@/api/hooks";
import { ErrorState, LoadingGrid, MetricCard, PageHeader } from "@/components/dex/primitives";
import { SimpleTable } from "@/components/dex/SimpleTable";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/home/")({
  head: () => seo("Home Assistant", "Dex-Ai Home Assistant — Home Assistant status and rooms."),
  component: HomeAssistantPage,
});

function HomeAssistantPage() {
  const status = useHomeStatus();
  const entities = useEntities();
  if (status.isError || entities.isError)
    return (
      <ErrorState
        error={status.error ?? entities.error}
        onRetry={() => {
          void status.refetch();
          void entities.refetch();
        }}
      />
    );
  const unavailable = entities.data?.filter((entity) => !entity.available) ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Home"
        title="Home Assistant"
        description="Home Assistant status and rooms."
      />
      {!status.data || !entities.data ? (
        <LoadingGrid />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Home}
              label="Connection"
              value={status.data.connected ? "Connected" : "Offline"}
              status={<StatusBadge status={status.data.connected ? "connected" : "offline"} />}
            />
            <MetricCard
              icon={Radio}
              label="Entities"
              value={status.data.totalEntities}
              lines={[
                { k: "Sensors", v: status.data.sensors },
                { k: "Unavailable", v: status.data.unavailable },
              ]}
            />
            <MetricCard
              icon={Lightbulb}
              label="Active devices"
              value={status.data.lightsOn + status.data.activeSwitches}
              lines={[
                { k: "Lights on", v: status.data.lightsOn },
                { k: "Switches on", v: status.data.activeSwitches },
              ]}
            />
            <MetricCard
              icon={Activity}
              label="Availability"
              value={`${Math.round(((status.data.totalEntities - status.data.unavailable) / Math.max(1, status.data.totalEntities)) * 100)}%`}
              status={<StatusBadge status={status.data.unavailable ? "warning" : "online"} />}
            />
          </div>
          <div className="mt-6">
            <SimpleTable
              title="Unavailable entities"
              headers={["Entity", "Type", "State", "Last changed"]}
              rows={unavailable.map((entity) => [
                <div>
                  <div className="font-medium">{entity.name}</div>
                  <code className="text-[11px] text-muted-foreground">{entity.entityId}</code>
                </div>,
                entity.type,
                <StatusBadge status={entity.state} />,
                timeAgo(entity.lastUpdated),
              ])}
              emptyTitle="All entities are available"
              emptyDescription="Home Assistant currently reports no unavailable or unknown entities."
            />
          </div>
        </>
      )}
    </>
  );
}
