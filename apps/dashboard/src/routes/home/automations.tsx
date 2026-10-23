import { createFileRoute } from "@tanstack/react-router";
import { useAutomations } from "@/api/hooks";
import { ErrorState, LoadingGrid, PageHeader } from "@/components/dex/primitives";
import { SimpleTable } from "@/components/dex/SimpleTable";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/home/automations")({
  head: () => seo("Automations", "Dex-Ai Automations — Home Assistant automations."),
  component: AutomationsPage,
});

function AutomationsPage() {
  const query = useAutomations();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <>
      <PageHeader eyebrow="Home" title="Automations" description="Home Assistant automations." />
      {!query.data ? (
        <LoadingGrid />
      ) : (
        <SimpleTable
          title="Home Assistant automations"
          headers={["Automation", "Source", "Status", "Last changed"]}
          rows={query.data.map((automation) => [
            <div>
              <div className="font-medium">{automation.name}</div>
              <code className="text-[11px] text-muted-foreground">{automation.id}</code>
            </div>,
            automation.trigger,
            <StatusBadge
              status={automation.enabled ? "on" : "off"}
              label={automation.enabled ? "Enabled" : "Disabled"}
            />,
            automation.lastRun ? timeAgo(automation.lastRun) : "Never",
          ])}
          emptyTitle="No automations found"
          emptyDescription="Home Assistant has not returned any automation entities."
        />
      )}
    </>
  );
}
