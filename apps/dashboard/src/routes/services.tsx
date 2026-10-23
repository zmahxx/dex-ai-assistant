import { createFileRoute } from "@tanstack/react-router";
import { useServices } from "@/api/hooks";
import { ErrorState, LoadingGrid, PageHeader } from "@/components/dex/primitives";
import { ServicesTable } from "@/components/dex/ServicesTable";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/services")({
  head: () => seo("Services", "Dex-Ai Services — Uptime and response times for homelab services."),
  component: ServicesPage,
});

function ServicesPage() {
  const query = useServices();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const services = query.data;
  return (
    <>
      <PageHeader
        eyebrow="Infrastructure"
        title="Services"
        description="Uptime and response times for homelab services."
      />
      {!services ? (
        <LoadingGrid />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Online", services.filter((service) => service.status === "online").length],
              ["Needs attention", services.filter((service) => service.status !== "online").length],
              ["Monitored", services.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="dex-card p-4">
                <div className="eyebrow">{label}</div>
                <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
              </div>
            ))}
          </div>
          <ServicesTable services={services} />
        </>
      )}
    </>
  );
}
