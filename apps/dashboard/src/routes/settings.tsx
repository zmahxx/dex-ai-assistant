import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole, Server } from "lucide-react";
import { getApiBaseUrl } from "@/api/client";
import { useHealth } from "@/api/hooks";
import { ErrorState, PageHeader, Panel } from "@/components/dex/primitives";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/settings")({
  head: () => seo("Settings", "Dex-Ai Settings — backend connection and device token."),
  component: SettingsPage,
});

function SettingsPage() {
  const health = useHealth();

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Dashboard connection"
        description="Server-managed authentication for every browser on your LAN."
      />
      {health.isError ? (
        <ErrorState error={health.error} onRetry={() => health.refetch()} />
      ) : (
        <div className="grid max-w-4xl gap-4 md:grid-cols-2">
          <Panel title="Connection">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg border border-success/30 bg-success/10 text-success">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <div className="font-medium">{health.data ? "Connected" : "Checking…"}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {getApiBaseUrl()}
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Credential boundary">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold-text">
                <LockKeyhole className="size-5" />
              </div>
              <div>
                <div className="font-medium">Server-side token</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dex-Ai and Home Assistant credentials stay on the Linux host. Browsers receive no
                  API keys.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Endpoint" className="md:col-span-2">
            <div className="flex items-center gap-3 text-sm">
              <Server className="size-4 text-gold-text" />
              <span>Dashboard proxy</span>
              <code className="ml-auto rounded bg-muted px-2 py-1 text-xs">{getApiBaseUrl()}</code>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
