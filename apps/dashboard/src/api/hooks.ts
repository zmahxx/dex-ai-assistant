import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, openLiveStream } from "./client";

export const qk = {
  health: ["health"],
  system: ["system"],
  services: ["services"],
  containers: ["containers"],
  home: ["home"],
  rooms: ["rooms"],
  entities: ["entities"],
  automations: ["automations"],
  tasks: ["tasks"],
  projects: ["projects"],
  events: ["events"],
  clients: ["clients"],
  tools: ["tools"],
  network: ["network"],
} as const;

export const useHealth = () => useQuery({ queryKey: qk.health, queryFn: api.health });
export const useSystem = () => useQuery({ queryKey: qk.system, queryFn: api.systemStatus });
export const useServices = () => useQuery({ queryKey: qk.services, queryFn: api.services });
export const useContainers = () => useQuery({ queryKey: qk.containers, queryFn: api.containers });
export const useHomeStatus = () => useQuery({ queryKey: qk.home, queryFn: api.homeStatus });
export const useRooms = () => useQuery({ queryKey: qk.rooms, queryFn: api.rooms });
export const useEntities = () => useQuery({ queryKey: qk.entities, queryFn: api.entities });
export const useAutomations = () =>
  useQuery({ queryKey: qk.automations, queryFn: api.automations });
export const useTasks = () => useQuery({ queryKey: qk.tasks, queryFn: api.tasks });
export const useProjects = () => useQuery({ queryKey: qk.projects, queryFn: api.projects });
export const useEvents = () => useQuery({ queryKey: qk.events, queryFn: api.events });
export const useClients = () => useQuery({ queryKey: qk.clients, queryFn: api.clients });
export const useTools = () => useQuery({ queryKey: qk.tools, queryFn: api.tools });
export const useNetwork = () => useQuery({ queryKey: qk.network, queryFn: api.network });

export function useDexMutation<A extends unknown[], R>(
  fn: (...a: A) => Promise<R>,
  invalidate: readonly (readonly string[])[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: A) => fn(...args),
    onSuccess: () => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: qk.events });
    },
  });
}

export type ConnectionState = "connecting" | "live" | "offline";

/** Subscribes to authenticated live updates through the same-origin dashboard proxy. */
export function useLiveUpdates(): ConnectionState {
  const qc = useQueryClient();
  const [state, setState] = useState<ConnectionState>("connecting");
  useEffect(() => {
    const live = [qk.system, qk.services, qk.containers, qk.events];
    const controller = new AbortController();
    void openLiveStream(controller.signal, ({ event }) => {
      setState("live");
      if (event === "system.status") void qc.invalidateQueries({ queryKey: qk.system });
      else live.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
    }).catch(() => {
      if (!controller.signal.aborted) setState("offline");
    });
    return () => controller.abort();
  }, [qc]);
  return state;
}
