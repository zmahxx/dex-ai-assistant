import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Home, Radio, Server } from "lucide-react";
import { PageHeader, Panel } from "@/components/dex/primitives";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dex/tools")({
  head: () => seo("Tools", "Dex-Ai Tools — Tools Dex-Ai can use."),
  component: ToolsPage,
});

function ToolsPage() {
  const tools = [
    {
      name: "System telemetry",
      description: "CPU, memory, disk, temperature, network and systemd service state.",
      icon: Server,
    },
    {
      name: "Docker control",
      description: "Container inventory plus validated start, stop and restart actions.",
      icon: Boxes,
    },
    {
      name: "Home Assistant",
      description: "Entity inventory, status, light control and safe entity refresh.",
      icon: Home,
    },
    {
      name: "Live event stream",
      description: "Authenticated server-sent system updates and recorded actions.",
      icon: Radio,
    },
  ];
  return (
    <>
      <PageHeader eyebrow="Dex-Ai" title="Tools" description="Tools Dex-Ai can use." />
      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <Panel key={tool.name}>
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold-text">
                <tool.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{tool.name}</h2>
                  <StatusBadge status="online" label="Available" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
