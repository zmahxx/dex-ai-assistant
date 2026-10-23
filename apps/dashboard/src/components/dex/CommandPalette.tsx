import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { NAV_FLAT } from "./nav";

const COMMANDS = ["Restart Plex", "Turn office light off", "Check server CPU"];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages or ask Dex-Ai to do something…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Dex-Ai commands">
          {COMMANDS.map((c) => (
            <CommandItem key={c} onSelect={() => { onOpenChange(false); toast(`“${c}” sent to Dex-Ai`, { description: "Commands run once the backend is connected." }); }}>{c}</CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Go to">
          {NAV_FLAT.map((n) => (
            <CommandItem key={n.to} onSelect={() => { onOpenChange(false); navigate({ to: n.to }); }}>
              <n.icon className="size-4 text-gold-text" />{n.group ? `${n.group} · ` : ""}{n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
