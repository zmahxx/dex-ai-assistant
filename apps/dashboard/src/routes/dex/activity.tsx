import { createFileRoute } from "@tanstack/react-router";
import { useEvents } from "@/api/hooks";
import { EventFeed } from "@/components/dex/EventFeed";
import { ErrorState, LoadingGrid, PageHeader, Panel } from "@/components/dex/primitives";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dex/activity")({
  head: () => seo("Activity", "Dex-Ai Activity — Actions performed through Dex-Ai."),
  component: ActivityPage,
});

function ActivityPage() {
  const query = useEvents();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const activity = query.data?.filter(
    (event) => event.source === "dexai" || event.source === "docker" || event.source === "home",
  );
  return (
    <>
      <PageHeader
        eyebrow="Dex-Ai"
        title="Activity"
        description="Actions performed through Dex-Ai."
      />
      {!activity ? (
        <LoadingGrid />
      ) : (
        <Panel title="Recorded actions" bodyClassName="py-2">
          <EventFeed events={activity} />
        </Panel>
      )}
    </>
  );
}
