# Dexter (Dex-AI) Desktop Assistant

Dexter is a Windows desktop assistant for AI chat and local system workflows, including optional Docker, Home Assistant, and Codex CLI integrations. It was created as a personal project under its owner's direction to explore a local assistant with explicit permissions around state-changing tools.

## Development and attribution

The owner directed the project requirements and overall product. Development used AI-assisted coding, and Lovable was used to generate dashboard UI components. The source does not track a line-by-line division between generated code and human-authored design, integration, and review, so this README does not claim that all code was manually written.

## Languages and frameworks

- TypeScript and JavaScript
- Electron, React, Node.js, and Vite
- OpenAI API client, Zod validation, and a separate local service
- Vitest test source

## Architecture

The Electron main process owns privileged operations. The renderer communicates through a restricted preload bridge and typed IPC. The assistant tool registry validates inputs and uses confirmation gates for actions that can change local state. A separate Node service exposes system, Docker, and Home Assistant integrations; the React dashboard calls that service through a backend proxy.

## Functionality represented in source

- Desktop chat interface and settings for an OpenAI API key.
- File listing, folder opening/creation, system information, browser opening, and optional Codex CLI task actions.
- Explicit confirmation for higher-impact tool actions.
- A local service with status and action endpoints for system services, Docker, and Home Assistant.
- A separate dashboard for service, device, event, task, and system views.

Some dashboard/API capabilities are incomplete or demonstrative. Source presence does not establish that every integration works against a live installation.

## Setup and configuration

Use Windows with a compatible Node.js and pnpm installation. From the repository root, install the workspace dependencies and start the desktop app:

    pnpm install --frozen-lockfile
    pnpm dev

To build and start the separate local service, set its required environment values in the service process, then run:

    pnpm --filter @dex-ai/backend build
    pnpm --filter @dex-ai/backend start

A local OpenAI API key is required for model features. It can be supplied through the settings screen, OPENAI_API_KEY, or the supported local .env locations. When available, the desktop app stores the key using Windows secure storage. These commands are documented from the package scripts but were not run during this review.

The optional local service requires DEX_AI_TOKEN with at least 32 characters in its process environment. The dashboard proxy uses the same token. Configure HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN only when using Home Assistant. DEX_AI_HOST defaults to 127.0.0.1 for loopback-only use. The dashboard proxy also accepts DEX_AI_BACKEND_URL (default http://127.0.0.1:8787). The service supports DEX_AI_PORT, DEX_AI_ALLOWED_ORIGINS, and DEX_AI_MONITORED_SERVICES. Its default bind is loopback; use an explicit network bind only when needed, with a private token and a trusted firewall configuration.

The dashboard displays the configured projects folder to its local user. This is a runtime setting, not a committed personal path. Codex CLI and Home Assistant are optional integrations and require their own local setup.

## Third-party components and licensing

Copied shadcn/ui component source is MIT licensed and credited in THIRD_PARTY_NOTICES.md. Radix UI primitives and the remaining JavaScript packages are resolved as dependencies from the manifests and lockfiles rather than vendored in this repository. The dashboard requests Geist and Geist Mono from Google Fonts at runtime; font files are not bundled in this repository. Dexter has no project-wide open-source license at this time.

## Limitations

- This is a local assistant prototype, not a general-purpose autonomous agent.
- Some dashboard and API features are stubs or incomplete.
- Device actions, Home Assistant behavior, deployment, and Windows packaging have not been independently verified.
- Tests and builds have not been run for this publishing copy.
- Review the local integration configuration before enabling actions.



