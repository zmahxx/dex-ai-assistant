import { createFileRoute } from "@tanstack/react-router";
import { useEvents } from "@/api/hooks";
import { EventFeed } from "@/components/dex/EventFeed";
import { ErrorState, LoadingGrid, PageHeader, Panel } from "@/components/dex/primitives";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/events")({
  head: () => seo("Events", "Dex-Ai Events — Alerts and events across the platform."),
  component: EventsPage,
});

function EventsPage() {
  const query = useEvents();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="Events"
        description="Alerts and events across the platform."
      />
      {!query.data ? (
        <LoadingGrid />
      ) : (
        <Panel title={`${query.data.length} recorded events`} bodyClassName="py-2">
          <EventFeed events={query.data} />
        </Panel>
      )}
    </>
  );
}
