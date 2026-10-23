import { createFileRoute } from "@tanstack/react-router";
import { useProjects } from "@/api/hooks";
import {
  EmptyState,
  ErrorState,
  LoadingGrid,
  PageHeader,
  Panel,
} from "@/components/dex/primitives";
import { SimpleTable } from "@/components/dex/SimpleTable";
import { StatusBadge } from "@/components/dex/StatusBadge";
import { timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/codex/projects")({
  head: () => seo("Projects", "Dex-Ai Projects — Registered Codex projects."),
  component: ProjectsPage,
});

function ProjectsPage() {
  const query = useProjects();
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <>
      <PageHeader eyebrow="Codex" title="Projects" description="Registered Codex projects." />
      {!query.data ? (
        <LoadingGrid />
      ) : query.data.length === 0 ? (
        <Panel>
          <EmptyState
            title="No registered projects"
            description="The backend has no Codex project registry entries. Projects will appear here when orchestration is enabled."
          />
        </Panel>
      ) : (
        <SimpleTable
          title="Projects"
          headers={["Project", "Path", "Branch", "Git", "Build", "Last activity"]}
          rows={query.data.map((project) => [
            <span className="font-medium">{project.name}</span>,
            <code className="text-xs">{project.path}</code>,
            project.branch,
            <StatusBadge status={project.gitStatus} />,
            <StatusBadge status={project.build} />,
            timeAgo(project.lastActivity),
          ])}
          emptyTitle="No projects"
          emptyDescription="No projects are registered."
        />
      )}
    </>
  );
}
