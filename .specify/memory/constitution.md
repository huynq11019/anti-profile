<!--
SYNC IMPACT REPORT
==================
Version change: None (initial ratification) → 1.0.0
Added sections:
  - Core Principles (I–V): Profile Isolation, Design-First, Local-First Architecture, Simplicity & Scalability, Security by Default
  - Technology Standards
  - Development Workflow & Quality Gates
  - Governance
Modified principles: N/A (first version)
Removed sections: All placeholder tokens replaced
Templates requiring updates:
  ✅ plan-template.md — Constitution Check section aligns
  ✅ spec-template.md — User story scope matches FR definitions
  ✅ tasks-template.md — Task phases align with principles
Follow-up TODOs: None
-->

# Anti-Detech Constitution

## Core Principles

### I. Profile Isolation (NON-NEGOTIABLE)

Every feature built in this project MUST preserve absolute isolation between browser profiles.
Profile data — including cookies, local storage, cache, session state, and browser fingerprints —
MUST never leak between profiles or to the host OS. New features that risk cross-profile data
contamination MUST include an isolation impact review before acceptance.

Rules:
- Each profile MUST use a separate `--user-data-dir` subdirectory
- No shared in-memory state or browser-readable global scope between profiles
- IPC between Electron main/renderer MUST never mix profile data in a single payload

### II. Design-First UI (NON-NEGOTIABLE)

The application is an action-first desktop dashboard. UI design MUST precede implementation.
For every new feature with a user-facing surface, a high-fidelity Stitch screen design MUST
be reviewed and approved before any React component is written. The design system defined in
`.stitch/DESIGN.md` MUST be followed for all screens.

Rules:
- Stitch designs MUST be generated and stored in `.stitch/designs/` before coding UI
- All React components MUST be derived from existing Stitch screens via the `react:components` skill
- Ad-hoc CSS outside the design system is PROHIBITED
- Dashboard layout: Header (60px) + Sidebar (240px glassmorphism) + Main content table

### III. Local-First Architecture

The application MUST be entirely self-contained on the user's machine. No feature may
introduce a mandatory cloud dependency, external API call during normal use, or telemetry
that transmits profile data off-device.

Rules:
- All persistent data MUST be stored in SQLite (`better-sqlite3`) at `database.sqlite`
- Profile browsing data MUST reside locally under `profiles/{id}/`
- Any optional network call (e.g., proxy test ping, license check) MUST be explicitly
  user-triggered and MUST NOT block the UI thread
- The app MUST function fully offline (except for proxy-dependent browser traffic)

### IV. Simplicity & Scalability

The codebase MUST stay simple enough for a single developer to maintain, while scaling to
manage 500+ browser profiles without performance degradation.

Rules:
- Prefer synchronous `better-sqlite3` over async ORM patterns for all DB reads
- Electron IPC MUST use `contextBridge.exposeInMainWorld` with typed `window.api` contracts
- React components MUST be split: UI components (`components/`) vs page-level containers (`pages/`)
- Profile list table MUST render 500+ rows without lag (use virtual scrolling if needed)
- YAGNI: Do not add abstractions unless they solve a current problem

### V. Security by Default

All sensitive data — proxy credentials, license keys — MUST be protected at rest.
The application MUST NOT expose raw credential strings to the renderer process.

Rules:
- Proxy passwords MUST be stored encrypted in SQLite (AES-256)
- IPC handlers in main process MUST validate all input from renderer before use
- `contextBridge` MUST be the only mechanism for renderer-to-main communication (no `remote` module)
- Browser automation endpoints (CDP debug ports) MUST only bind on `127.0.0.1`

## Technology Standards

The following technology choices are canonical for this project. Deviations MUST be justified
in the Complexity Tracking section of the relevant `plan.md`.

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Shell | Electron | v29+ |
| Build Tool | electron-vite | latest |
| Frontend Framework | React | v18+ |
| Styling | Tailwind CSS | v3+ |
| State Management | Zustand | v4+ |
| Database | better-sqlite3 | v9+ |
| Proxy Tunneling | proxy-chain | v2+ |
| Runtime | Node.js | v20 LTS |
| Language | TypeScript | v5+ |
| Testing | Vitest + Playwright | latest |
| UI Design | Google Stitch | via MCP |

Design color palette (canonical, from UI spec):
- Background: `#0F1115`
- Surface: `#151821`
- Border: `#1F2937` / `#242938`
- Accent: Cyan (`#00FFFF` / `rgba(0,255,255,0.08)` hover)
- Sidebar glass: `rgba(255,255,255,0.04)`, blur `12px`

## Development Workflow & Quality Gates

### Feature Development Flow

1. Write/update `spec.md` (user stories + acceptance criteria) → `/speckit.specify`
2. Design UI screens in Stitch → `/stitch-design` or `/stitch-loop`
3. Generate `plan.md` with architecture decisions → `/speckit.plan`
4. Generate `tasks.md` with ordered task list → `/speckit.tasks`
5. Implement tasks one at a time, checkpoint after each user story
6. Validate fingerprint isolation after any profile-touching change

### Quality Gates (all MUST pass before merge)

- [ ] Stitch design approved for all new screens
- [ ] Profile isolation test: two profiles cannot share cookies (automated or manual)
- [ ] `pnpm vitest` passes for all DB/service unit tests
- [ ] No raw proxy credentials appear in renderer IPC payloads
- [ ] Dashboard renders 500-row profile table at > 30fps (visual check or performance test)

### Coding Standards

- All IPC channels MUST be declared in `contracts/ipc-contracts.md` before implementation
- All database schema changes MUST update `data-model.md` first
- `window.api` interface types MUST be defined in `src/shared/ipc.types.ts`

## Governance

This Constitution supersedes all other development practices and guidelines in this repository.
All feature planning MUST reference this Constitution during the Constitution Check gate in `plan.md`.

Amendment procedure:
1. Propose amendment with rationale in a PR description or spec comment
2. Update `.specify/memory/constitution.md` via `/speckit.constitution` command
3. Increment version: PATCH for wording / MINOR for new principle / MAJOR for removals
4. Propagate changes to all templates (see Sync Impact Report above)
5. Add amendment note to commit message: `docs: amend constitution to vX.Y.Z`

All agent-generated plans and tasks MUST verify Constitution compliance. Violations flagged
as ERROR in the Constitution Check gate are blockers and MUST be resolved before proceeding.

**Version**: 1.0.0 | **Ratified**: 2026-03-22 | **Last Amended**: 2026-03-22
