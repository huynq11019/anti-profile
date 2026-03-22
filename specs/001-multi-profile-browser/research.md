# Phase 0: Research & Clarifications

## Resolved Clarifications & Technical Decisions

### 1. Framework Versions (Electron & Frontend)
- **Decision**: Electron 29, Node.js 20 LTS, React 18, Vite.
- **Rationale**: Vite provides extremely fast HMR for Electron apps (e.g., using `electron-vite`), and React 18 has excellent ecosystem support for complex component trees (like large tables of 500+ items for the dashboard).
- **Alternatives considered**: Vue 3 was considered due to its lightweight reactivity, but the React ecosystem has slightly better UI library support for heavy data grids.

### 2. Chromium Binary Management
- **Decision**: Provide a dedicated customized Chromium binary explicitly built for bypassing bot checks within the `/browser/` root directory.
- **Rationale**: System Chrome installations update automatically which breaks driver patterns. Ungoogled Chrome needs specific compile-time patches to mask browser metrics fully (like `navigator.webdriver` removal).
- **Alternatives considered**: Puppeteer-core downloaded Chrome. However, it lacks deep patch support for WebRTC and Canvas manipulation at the C++ level. 

### 3. Proxy Chain Native Architecture
- **Decision**: Using `proxy-chain` to create localhost HTTP proxies that tunnel upstream to authenticated proxies, injected into the Chromium arguments.
- **Rationale**: Chromium's `--proxy-server` argument does not accept username/password natively without triggering an annoying UI popup or relying on a secondary extension. Tunneling on Node OS avoids extensions entirely.
- **Alternatives considered**: Automatic Chrome extension manifest generation for proxies was considered but dropped because it impacts Chrome instance startup times and breaks strict extension environment isolation testing. 

### 4. Database Setup
- **Decision**: `better-sqlite3`.
- **Rationale**: Best synchronous SQLite driver. Fast enough to read/write without complex `await` waterfalls on the main thread, making profile listing virtually instant.
- **Alternatives considered**: LevelDB/JSON files were considered, but relational queries (sort, group, filter) scale poorly beyond simple key-values.

### 5. IPC (Inter-Process Communication) and Data Model Synchronization
- **Decision**: `contextBridge.exposeInMainWorld` to create a `window.api` contract between Renderer and Main. Data models passed through IPC must be primitive or cloned objects.
- **Rationale**: Context Isolation is mandatory for Electron security.

### 6. Managing Profile Status Changes
- **Decision**: Track child processes using `spawn` PID. Map profile ID -> PID in memory on the main process. Upon `exit` event, IPC message sent to renderer to update the dashboard table row status to 'closed'. 
- **Rationale**: Reliable and avoids polling system process tables.
