import { createFileRoute } from "@tanstack/react-router";
import { Globe2, LockKeyhole } from "lucide-react";
import { PageHeader, Panel } from "@/components/dex/primitives";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dex/clients")({
  head: () => seo("Clients", "Dex-Ai Clients — Connected Dex-Ai clients and voice satellites."),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Dex-Ai"
        title="Clients"
        description="Connected Dex-Ai clients and voice satellites."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Dashboard session">
          <div className="flex items-start gap-3">
            <Globe2 className="mt-0.5 size-5 text-gold-text" />
            <div>
              <div className="flex items-center gap-2 font-medium">
                Current browser <StatusBadge status="live" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Connected through the same-origin dashboard proxy. No API token is stored in this
                browser.
              </p>
            </div>
          </div>
        </Panel>
        <Panel title="Client registry">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 size-5 text-gold-text" />
            <div>
              <div className="font-medium">Private by default</div>
              <p className="mt-1 text-xs text-muted-foreground">
                The backend does not currently retain browser IPs, device fingerprints, or
                voice-satellite registrations.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
