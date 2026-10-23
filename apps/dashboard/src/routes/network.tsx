import { createFileRoute } from "@tanstack/react-router";
import { useNetwork } from "@/api/hooks";
import { ErrorState, LoadingGrid, PageHeader } from "@/components/dex/primitives";
import { SimpleTable } from "@/components/dex/SimpleTable";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/network")({
  head: () => seo("Network", "Dex-Ai Network — Devices and latency on the homelab network."),
  component: NetworkPage,
});

function NetworkPage() {
  const query = useNetwork();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow="Infrastructure"
        title="Network"
        description="Devices and latency on the homelab network."
      />
      {!query.data ? (
        <LoadingGrid />
      ) : (
        <SimpleTable
          title="Host interfaces"
          headers={["Interface", "Address", "Family", "Status"]}
          rows={query.data.map((device) => [
            <span className="font-medium">{device.name}</span>,
            <code className="text-xs">{device.ip}</code>,
            device.ip.includes(":") ? "IPv6" : "IPv4",
            <StatusBadge status={device.online ? "online" : "offline"} />,
          ])}
          emptyTitle="No LAN interfaces reported"
          emptyDescription="The Linux host did not expose a non-loopback address."
        />
      )}
    </>
  );
}
