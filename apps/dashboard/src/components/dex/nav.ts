import {
  Activity, Bell, Bot, Boxes, Cpu, FolderGit2, Globe, Home, LayoutDashboard, Lamp, ListChecks,
  MonitorSmartphone, Server, Settings, Sofa, Workflow, Wrench,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: typeof Home };
export type NavGroup = { label?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { items: [{ to: "/", label: "Overview", icon: LayoutDashboard }] },
  { label: "Infrastructure", items: [
    { to: "/system", label: "System", icon: Cpu },
    { to: "/docker", label: "Docker", icon: Boxes },
    { to: "/services", label: "Services", icon: Server },
    { to: "/network", label: "Network", icon: Globe },
  ] },
  { label: "Home", items: [
    { to: "/home", label: "Overview", icon: Home },
    { to: "/home/devices", label: "Devices", icon: Lamp },
    { to: "/home/rooms", label: "Rooms", icon: Sofa },
    { to: "/home/automations", label: "Automations", icon: Workflow },
  ] },
  { label: "Codex", items: [
    { to: "/codex/tasks", label: "Tasks", icon: ListChecks },
    { to: "/codex/projects", label: "Projects", icon: FolderGit2 },
  ] },
  { label: "Dex-Ai", items: [
    { to: "/dex/activity", label: "Activity", icon: Activity },
    { to: "/dex/tools", label: "Tools", icon: Wrench },
    { to: "/dex/clients", label: "Clients", icon: MonitorSmartphone },
  ] },
  { items: [
    { to: "/events", label: "Events", icon: Bell },
    { to: "/settings", label: "Settings", icon: Settings },
  ] },
];

export const NAV_FLAT = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
export { Bot };
