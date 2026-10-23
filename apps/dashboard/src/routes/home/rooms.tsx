import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Radio, Sofa } from "lucide-react";
import { useEntities } from "@/api/hooks";
import type { HomeEntity } from "@/api/types";
import { ErrorState, LoadingGrid, PageHeader, Panel } from "@/components/dex/primitives";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/home/rooms")({
  head: () => seo("Rooms", "Dex-Ai Rooms — Room-by-room view of your home."),
  component: RoomsPage,
});

function RoomsPage() {
  const query = useEntities();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const grouped = (query.data ?? []).reduce<Record<string, HomeEntity[]>>((result, entity) => {
    const room = entity.room || "Unassigned";
    (result[room] ??= []).push(entity);
    return result;
  }, {});
  const groups = Object.entries(grouped);
  return (
    <>
      <PageHeader eyebrow="Home" title="Rooms" description="Room-by-room view of your home." />
      {!query.data ? (
        <LoadingGrid />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(([room, roomEntities]) => {
            const list = roomEntities ?? [];
            return (
              <Panel
                key={room}
                title={
                  <span className="flex items-center gap-2">
                    <Sofa className="size-4 text-gold-text" />
                    {room}
                  </span>
                }
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Radio className="size-3.5" />
                      Entities
                    </div>
                    <div className="mt-1 text-xl font-semibold">{list.length}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Boxes className="size-3.5" />
                      Available
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {list.filter((entity) => entity.available).length}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {room === "Unassigned"
                    ? "Area assignments are not exposed by the current Home Assistant REST response."
                    : "Home Assistant area"}
                </p>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
