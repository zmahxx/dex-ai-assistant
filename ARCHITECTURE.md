# Dexter Architecture

This describes the source structure in the publication staging copy. It intentionally omits hostnames, addresses, device inventories, and deployment instructions.

## Runtime boundaries

1. Electron main owns window lifecycle, privileged operations, and IPC.
2. The preload layer exposes the narrow bridge used by the React renderer.
3. The assistant layer coordinates model requests, tool selection, argument validation, permission checks, and confirmation.
4. The tool modules implement selected browser, filesystem, system, and Codex operations.
5. The separate dex-ai service exposes local status and integration routes for system, Docker, Home Assistant, and dashboard events.
6. The dashboard is a separate React application that reads service data and presents events, service status, devices, and Codex tasks.

## Trust boundaries

- Renderer code is untrusted input to privileged operations; IPC handlers and tool inputs require validation.
- Actions that change local state are intended to pass through permission and confirmation checks.
- API credentials and service tokens are runtime configuration and must never be committed.
- Home Assistant and Docker calls depend on user configuration and local service availability.
- External model and Codex integrations send requests to separately operated services; review what data is included before use.

## Incomplete areas

Some dashboard/API views remain stubs or are not verified against live integrations. The staged copy omits private homelab deployment and inventory materials. This document describes code boundaries, not a verified deployment.
