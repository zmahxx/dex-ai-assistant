import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { qk, useDexMutation, useEntities } from "@/api/hooks";
import type { HomeEntity } from "@/api/types";
import { ErrorState, LoadingGrid, PageHeader } from "@/components/dex/primitives";
import { SimpleTable } from "@/components/dex/SimpleTable";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/home/devices")({
  head: () => seo("Devices", "Dex-Ai Devices — Searchable Home Assistant entities and controls."),
  component: DevicesPage,
});

function DevicesPage() {
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<"all" | "available" | "unavailable">("all");
  const query = useEntities();
  const action = useDexMutation(api.entityAction, [qk.entities, qk.home]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const run = (entity: HomeEntity, body: Record<string, unknown>) => {
    setPendingId(entity.entityId);
    action.mutate([body], {
      onSuccess: () => toast.success(`${entity.name} updated`),
      onError: (error) => toast.error((error as Error).message),
      onSettled: () => setPendingId(null),
    });
  };
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const filtered =
    query.data?.filter(
      (entity) =>
        (availability === "all" || entity.available === (availability === "available")) &&
        `${entity.name} ${entity.entityId} ${entity.type}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Home"
        title="Devices"
        description="Searchable Home Assistant entities and controls."
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search entities"
          className="pl-9"
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter entities by availability">
        {(["all", "available", "unavailable"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={availability === value ? "default" : "outline"}
            aria-pressed={availability === value}
            onClick={() => setAvailability(value)}
          >
            {value === "all" ? "All" : value === "available" ? "Available" : "Unavailable"}
            {query.data &&
              ` (${value === "all" ? query.data.length : query.data.filter((entity) => entity.available === (value === "available")).length})`}
          </Button>
        ))}
      </div>
      {!query.data ? (
        <LoadingGrid />
      ) : (
        <SimpleTable
          title={`${filtered.length} entities`}
          headers={["Name", "Domain", "State", "Availability", "Updated", "Control"]}
          rows={filtered.map((entity) => [
            <div>
              <div className="font-medium">{entity.name}</div>
              <code className="text-[11px] text-muted-foreground">{entity.entityId}</code>
            </div>,
            entity.entityId.split(".")[0],
            <span className="font-mono text-xs">{entity.state}</span>,
            <StatusBadge
              status={entity.available ? "online" : "offline"}
              label={entity.available ? "Available" : "Unavailable"}
            />,
            timeAgo(entity.lastUpdated),
            <EntityControl
              entity={entity}
              busy={pendingId === entity.entityId}
              onAction={(body) => run(entity, body)}
            />,
          ])}
          emptyTitle="No matching entities"
          emptyDescription={
            search || availability !== "all"
              ? "Try another search or availability filter."
              : "Home Assistant returned no entities."
          }
        />
      )}
    </>
  );
}

function EntityControl({
  entity,
  busy,
  onAction,
}: {
  entity: HomeEntity;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const domain = entity.entityId.split(".")[0];
  const [numberValue, setNumberValue] = useState(entity.state);
  useEffect(() => setNumberValue(entity.state), [entity.state]);
  if (!entity.available) return <span className="text-xs text-muted-foreground">Unavailable</span>;
  if (domain === "switch") {
    const nextAction = entity.state === "on" ? "turn_off" : "turn_on";
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => onAction({ entityId: entity.entityId, action: nextAction })}
      >
        {busy ? "Updating…" : entity.state === "on" ? "Turn off" : "Turn on"}
      </Button>
    );
  }
  if (domain === "select" && entity.options?.length) {
    return (
      <select
        aria-label={`Set ${entity.name}`}
        className="h-8 max-w-44 rounded-md border bg-card px-2 text-xs"
        value={entity.state}
        disabled={busy}
        onChange={(event) =>
          onAction({
            entityId: entity.entityId,
            action: "select_option",
            option: event.target.value,
          })
        }
      >
        {entity.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (domain === "number" && entity.min !== undefined && entity.max !== undefined) {
    const value = Number(numberValue);
    return (
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Value for ${entity.name}`}
          type="number"
          min={entity.min}
          max={entity.max}
          step={entity.step ?? "any"}
          className="h-8 w-24 text-xs"
          value={numberValue}
          onChange={(event) => setNumberValue(event.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={
            busy ||
            !Number.isFinite(value) ||
            value < entity.min ||
            value > entity.max ||
            value === Number(entity.state)
          }
          onClick={() => onAction({ entityId: entity.entityId, action: "set_value", value })}
        >
          Set
        </Button>
      </div>
    );
  }
  return <span className="text-xs text-muted-foreground">Read only</span>;
}
