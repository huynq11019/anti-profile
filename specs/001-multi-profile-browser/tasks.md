---
description: "Task list template for feature implementation"
---

# Tasks: Multi-Profile Browser Manager

**Input**: Design documents from `/specs/001-multi-profile-browser/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ipc-contracts.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Electron + Vite + React + TS project structure in root
- [x] T002 [P] Configure strict TypeScript and ESLint rules in `.eslintrc.json`, `tsconfig.json`
- [x] T003 Setup TailwindCSS with "Cyber Shield" design system tokens in `tailwind.config.js` and `src/renderer/index.css`
- [x] T004 Setup `react-router-dom` and basic UI layout (Sidebar, Header) in `src/renderer/App.tsx` and `src/renderer/components/layout/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Setup SQLite database connection and migration runner using `better-sqlite3` in `src/main/database/db.ts`
- [x] T006 Implement IPC bridge in `src/preload/index.ts` and `src/main/ipc/`
- [x] T007 [P] Define shared TypeScript interfaces for Profile, Proxy, and Group in `src/shared/types/`
- [x] T008 Setup Chromium binary management utility to download/locate Ungoogled Chromium in `src/main/browser/browserManager.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Profile Creation and Isolation (Priority: P1) 🎯 MVP

**Goal**: Users can create distinct, isolated profiles so actions in one account do not affect others.

**Independent Test**: Create two distinct profiles, login to a different account on each, and confirm cookies/sessions do not leak.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create SQLite table and Repository for Profiles in `src/main/repositories/profileRepo.ts`
- [x] T010 [US1] Implement Main process IPC handlers for `profiles:*` crud in `src/main/ipc/profileHandlers.ts`
- [x] T011 [US1] Implement isolated Browser Launch logic in Main process using `child_process.spawn` in `src/main/browser/launcher.ts`
- [x] T012 [P] [US1] Build "Dashboard" screen UI component in `src/renderer/pages/Dashboard.tsx`
- [x] T013 [P] [US1] Build "Create Profile Modal" UI component in `src/renderer/components/modals/CreateProfileModal.tsx`
- [x] T014 [US1] Integrate Dashboard and Modal with IPC to fetch, display, and create profiles

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Consistent Fingerprint Management (Priority: P1)

**Goal**: Profiles present a unique but consistent hardware and software fingerprint every time they open.

**Independent Test**: Open a profile, check fingerprinting site, close, reopen, verify metrics are identical.

### Implementation for User Story 2

- [x] T015 [US2] Extend Profile schema to save `fingerprint_seed` via migrations
- [x] T016 [US2] Implement Fingerprint generation logic (Canvas, WebGL, UserAgent) based on seed in `src/main/browser/fingerprintEngine.ts`
- [x] T017 [US2] Inject fingerprint spoofing arguments into Chromium launch sequence in `src/main/browser/launcher.ts`

---

## Phase 5: User Story 3 & 8 - Proxy & Group Management (Priority: P2)

**Goal**: Assign proxies to profiles and manage centralized lists of proxies and groups.

**Independent Test**: Assign a proxy to a profile, launch it, check detected IP/timezone on geolocation site.

### Implementation for User Story 3 & 8

- [x] T018 [P] [US3] Create SQLite tables and Repositories for Proxies and Groups in `src/main/repositories/`
- [x] T019 [US3] Implement Main IPC handlers for Proxy and Group CRUD operations in `src/main/ipc/`
- [x] T020 [P] [US3] Build "Proxy Manager" screen UI component in `src/renderer/pages/ProxyManager.tsx`
- [x] T021 [US3] Integrate `proxy-chain` to create local authenticated upstream tunnels in `src/main/browser/proxyServer.ts`
- [x] T022 [US3] Modify Chromium launch sequence to route traffic through local tunnel when proxy is assigned

---

## Phase 6: User Story 4 - Profile Status Management (Priority: P2)

**Goal**: Visual dashboard to start, stop, and monitor the active status of multiple profiles.

**Independent Test**: Start multiple profiles and observe dashboard accurately reflecting "Running" vs "Closed".

### Implementation for User Story 4

- [x] T023 [US4] Implement PID tracking map in Main process to track running browser instances in `src/main/browser/processTracker.ts`
- [x] T024 [US4] Add IPC event broadcasting to push real-time status to Renderer in `src/main/ipc/statusBroadcaster.ts`
- [x] T025 [US4] Update Dashboard UI to reflect "Running/Closed" status dynamically and handle Start/Stop actions

---

## Phase 7: User Story 6 - Bulk Profile Operations (Priority: P2)

**Goal**: Perform actions (open, close, change proxy) on multiple profiles at once.

**Independent Test**: Select 5 profiles, apply "Bulk Open", verify all 5 launch successfully.

### Implementation for User Story 6

- [x] T026 [P] [US6] Add checkbox selection state and Bulk Action dropdown to Dashboard table in `src/renderer/pages/Dashboard.tsx`
- [x] T027 [US6] Implement IPC handlers for Bulk Open, Bulk Close, and Bulk Proxy Assign in `src/main/ipc/bulkHandlers.ts`
- [x] T028 [US6] Implement queue manager in `src/main/browser/queueManager.ts` to prevent system crash when bulk opening 50+ profiles

---

## Phase 8: User Story 7 - Cookie Management (Priority: P2)

**Goal**: Import/export cookies for a profile to restore sessions quickly.

**Independent Test**: Export cookie from logged-in profile, import to new profile, confirm session is active on target website.

### Implementation for User Story 7

- [x] T029 [US7] Implement IPC handlers to read/write specific profile's Netscape/JSON cookie files in `src/main/ipc/cookieHandlers.ts`
- [x] T030 [P] [US7] Build "Cookies Management" screen UI component in `src/renderer/pages/CookiesManager.tsx`
- [x] T031 [US7] Integrate drag & drop cookie import and table viewer logic in UI

---

## Phase 9: User Story 5 - External Automation Support (Priority: P3)

**Goal**: Connect external scripts (Playwright/Puppeteer) to running profiles.

**Independent Test**: Launch a profile, connect a basic Playwright script via CDP port, navigate to a page.

### Implementation for User Story 5

- [ ] T032 [US5] Implement dynamic CDP (Chrome DevTools Protocol) port assignment per profile in `src/main/browser/launcher.ts`
- [x] T033 [P] [US5] Build "Automation Scripts" screen UI component in `src/renderer/pages/Automation.tsx`
- [ ] T034 [US5] Implement automation script execution engine via `child_process.fork` in `src/main/automation/scriptRunner.ts`
- [ ] T035 [US5] Stream script stdout/stderr back to Automation UI console via IPC logs stream

---

## Phase 10: User Story 10 - System/Settings Management (Priority: P3)

**Goal**: See real-time system resource usage, license, and global application settings.

**Independent Test**: Open multiple profiles and observe CPU/RAM updates. Open Settings and verify info.

### Implementation for User Story 10

- [ ] T036 [US10] Implement OS resource polling (CPU, RAM) via node `os` module in `src/main/system/monitor.ts`
- [x] T037 [P] [US10] Build "Settings" screen UI component in `src/renderer/pages/Settings.tsx`
- [ ] T038 [US10] Integrate real-time stats and license info into Header component `src/renderer/components/layout/Header.tsx`

---

## Phase 11: Profile Management Enhancements (Priority: P1)

**Goal**: Provide full quick-actions workflow for profile operations in both inline row actions and edit modal flow.

**Independent Test**: From Profiles page, execute pin/open-folder/proxy bulk operations, and verify persistence + behavior after reload.

### Implementation for Profile Management Enhancements

- [x] T044 [US11] Add pin-to-top behavior by sorting pinned profiles first in `src/main/repositories/profileRepo.ts`
- [x] T045 [US11] Add open profile folder IPC + preload bridge in `src/main/ipc/profileHandlers.ts`, `src/shared/types/index.ts`, `src/preload/index.ts`
- [x] T046 [US11] Add one-to-one bulk proxy assignment IPC in `src/main/ipc/bulkHandlers.ts` and bridge typing in `src/shared/types/window.d.ts`
- [x] T047 [US11] Add inline pin/open-folder quick actions in `src/renderer/src/components/profiles/ProfileRow.tsx`
- [x] T048 [US11] Extend Profiles bulk toolbar with remove-proxy + unique-proxy mapping modal in `src/renderer/src/pages/Profiles.tsx`
- [x] T049 [US11] Extend dashboard hook orchestration for pin/open-folder/proxy-map actions in `src/renderer/src/hooks/useDashboard.ts`
- [x] T050 [US11] Add inline quick edit for profile name/group/note in `src/renderer/src/components/profiles/ProfileRow.tsx` and `src/renderer/src/pages/Profiles.tsx`
- [x] T051 [US11] Implement extensions install/remove/toggle flow (unpacked, CRX, webstore URL) in `src/main/services/` + `src/main/ipc/` + `src/renderer/src/pages/`
- [x] T052 [US11] Implement bookmarks add/delete/import JSON with restart-required policy in `src/main/ipc/` + `src/main/repositories/` + `src/renderer/src/pages/`
- [x] T053 [US11] Implement profile export ZIP with Save dialog in `src/main/ipc/index.ts` and `src/main/services/`

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T039 Clean up unused Tailwind classes and enforce full "Cyber Shield" design specs across all components
- [ ] T040 Implement graceful error handling and alert toasts for IPC failures in `src/renderer/utils/errorHandler.ts`
- [ ] T041 Map Hotkeys (e.g., CMD/CTRL + N for New Profile)
- [ ] T042 Verify all database queries are optimal for large datasets (500+ rules)
- [ ] T043 Package application using `electron-builder`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed in sequential order (US1 → US2 → US3...)

### Parallel Opportunities

- Shared Infrastructure Setup and Foundational interfaces/UI layout can run in parallel before backend linking.
- All UI tasks marked `[P]` (e.g., `T012`, `T013`, `T020`, `T030`, `T037`) can be built in parallel using the `/react:components` skill mapped from Stitch HTML designs.
- Main process business logic (IPC, SQLite) can be done while UI is being generated.
