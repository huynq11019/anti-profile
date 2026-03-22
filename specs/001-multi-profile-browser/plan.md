# Implementation Plan: Multi-Profile Browser Manager

**Branch**: `001-multi-profile-browser` | **Date**: 2026-03-22 | **Spec**: [specs/001-multi-profile-browser/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multi-profile-browser/spec.md`

## Summary

Build the core multi-profile anti-detect browser manager using Electron, Node.js, and React.js/Vue 3. The system will create isolated Chromium user data directories, spoof hardware/software fingerprints (Canvas, WebGL, etc.), assign explicit proxies via `proxy-chain`, and manage instances using a local SQLite database for scaling to 500+ profiles.

## Technical Context

**Language/Version**: TypeScript/Node.js v20+, Electron v28+, React 18+  
**Primary Dependencies**: `electron`, `better-sqlite3`, `proxy-chain`, `tailwindcss`  
**Storage**: SQLite (`better-sqlite3`) with local JSON/file storage in `/profiles/{id}/`  
**Testing**: Vitest for unit tests; Playwright for automation bypassing and fingerprinting isolation test  
**Target Platform**: Windows/macOS Desktop App (via Electron)  
**Project Type**: Desktop App  
**Performance Goals**: Manage status of 500+ profiles without UI degradation  
**Constraints**: Must bypass CreepJS, PixelScan without leaking OS metrics. Profile data size must be managed (Clean Cache).  
**Scale/Scope**: ~10 screens/modals, local application, 500+ identities  

## Constitution Check

*GATE: Passed*

No strict architectural constraints violated from the project constitution skeleton. We maintain an offline-first modular desktop architecture.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-profile-browser/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main/                 # Electron main process
│   ├── database/         # SQLite schemas and better-sqlite3 adapters
│   ├── browser/          # Chromium launch, profile isolation & proxy-chain logic
│   ├── ipc/              # Main process IPC handlers
│   └── index.ts          # Main process entry point
│
├── renderer/             # React/Vue frontend (Dashboard)
│   ├── components/       # Shared UI components
│   ├── pages/            # Group, Proxy, Profile lists
│   ├── store/            # State management 
│   ├── ipc/              # Renderer IPC invokers
│   └── index.tsx         # Frontend entry point
│
└── shared/               # Shared types, constants, models
```

**Structure Decision**: An Electron standard structure separating `main` (backend/OS) and `renderer` (frontend/UI) processes. `shared` holds types and IPC interface contracts. No backend cloud service since this is entirely local SQLite.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Usage of `proxy-chain` | Node/Chromium lack built-in support for proxy authentication chaining at scale | Raw netcat / iptables would require host OS permission changes |
