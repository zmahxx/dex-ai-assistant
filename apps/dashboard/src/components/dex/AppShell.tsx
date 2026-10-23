import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Command, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEvents, useLiveUpdates, type ConnectionState } from "@/api/hooks";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { Wordmark } from "./Logo";
import { NAV } from "./nav";
import { CommandPalette } from "./CommandPalette";

function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((g, gi) => (
        <div key={gi}>
          {g.label && !collapsed && (
            <div className="eyebrow mb-1.5 px-2.5 !text-[10px]">{g.label}</div>
          )}
          {g.label && collapsed && <div className="mx-auto mb-2 h-px w-5 bg-border" />}
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.to}>
                <Link
                  to={i.to}
                  onClick={onNavigate}
                  activeOptions={{ exact: true }}
                  title={collapsed ? `${g.label ?? ""} ${i.label}` : undefined}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    collapsed && "justify-center",
                  )}
                  activeProps={{
                    className:
                      "!bg-primary/8 !text-primary font-medium dark:!text-primary-foreground dark:!bg-primary/25",
                  }}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold" />
                      )}
                      <i.icon
                        className={cn(
                          "size-4 shrink-0",
                          isActive
                            ? "text-primary dark:text-gold"
                            : "text-muted-foreground group-hover:text-gold-text",
                        )}
                      />
                      {!collapsed && <span>{i.label}</span>}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Clock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    setT(new Date());
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular text-sm font-medium">
      {t
        ? t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "--:--:--"}
    </span>
  );
}

function ConnectionPill({ state }: { state: ConnectionState }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs md:flex">
      <span
        className={cn(
          "size-2 rounded-full",
          state === "live"
            ? "bg-success live-dot"
            : state === "offline"
              ? "bg-primary-accent"
              : "bg-warning",
        )}
      />
      <span className="font-medium">
        {state === "live" ? "Live" : state === "offline" ? "Disconnected" : "Connecting"}
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const conn = useLiveUpdates();
  const { theme, setTheme } = useTheme();
  const { data: events } = useEvents();
  const unacked = events?.filter((e) => !e.acknowledged) ?? [];
  const critical = unacked.some((e) => e.severity === "critical");

  useEffect(() => {
    // Remove credentials saved by the original per-browser connection flow.
    localStorage.removeItem("dex.apiToken");
    localStorage.removeItem("dex.apiUrl");
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div
          className={cn("flex h-16 items-center border-b px-4", collapsed && "justify-center px-0")}
        >
          <Link to="/">
            <Wordmark collapsed={collapsed} />
          </Link>
        </div>
        <SidebarNav collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 border-t px-5 py-3 text-xs text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="mx-auto size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              Collapse
            </>
          )}
        </button>
      </aside>

      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center border-b px-4">
            <Wordmark />
          </div>
          <SidebarNav onNavigate={() => setMobile(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobile(true)}>
            <Menu className="size-5" />
          </Button>
          <div className="lg:hidden">
            <Wordmark subtitle={false} />
          </div>
          <div
            className={cn(
              "hidden items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:flex",
              critical
                ? "border-primary-accent/30 bg-primary-accent/10 text-primary-accent"
                : "border-gold/40 bg-gold/10 text-gold-text",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {critical ? "Attention needed" : "System Healthy"}
          </div>
          <button
            onClick={() => setPalette(true)}
            className="ml-auto hidden h-9 w-64 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-gold/50 md:flex"
          >
            <Command className="size-3.5" />
            Search or command…
            <kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px] font-medium">
              Ctrl K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <ConnectionPill state={conn} />
            <div className="hidden px-2 xl:block">
              <Clock />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setPalette(true)}
            >
              <Command className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-4" />
                  {unacked.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                      {unacked.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Unacknowledged alerts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {unacked.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    All clear
                  </div>
                )}
                {unacked.slice(0, 5).map((e) => (
                  <DropdownMenuItem key={e.id} asChild>
                    <Link to="/events" className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-medium">{e.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {e.description} · {timeAgo(e.timestamp)}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/events">Open Event Center</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Profile">
                  <span className="grid size-7 place-items-center rounded-full border border-gold/50 bg-gold/10 text-gold-text">
                    <User className="size-3.5" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Zane · admin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dex/clients">Connected clients</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <CommandPalette open={palette} onOpenChange={setPalette} />
    </div>
  );
}
