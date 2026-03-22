# Quickstart: Build & Run Environment

This guide establishes the baseline commands needed for local development of the Multi-Profile Browser feature branch, assuming Electron ecosystem tools.

## Prerequisites
- Node.js LTS (v20+)
- Package Manager: `pnpm` (recommended for Electron speed)
- Chromium Binary placed in `/browser/chrome.exe` (macOS/Win target location overrides acceptable during development)

## 1. Local Setup
```bash
# Repo root (anti-detech)
cd /Users/helen/Documents/code/anti-detech

# Install electron native dependencies / build better-sqlite3 hooks
pnpm install

# Optional: Ensure better-sqlite3 binds against Electron architecture
pnpm rebuild better-sqlite3 --build-from-source \
  --runtime=electron \
  --target=28.0.0 \
  --dist-url=https://electronjs.org/headers
```

## 2. Running Local Stack
We use a standard Vite-Electron boot sequence.

```bash
# Spin up Renderer (Vite) and Main (Electron) together
# Will boot Electron, load Vite Dev Server on Localhost:5173 
pnpm run dev
```

### 3. Testing Context
Vitest runs headless logic checks on the Database bindings and Proxy Chain setup. Playwright tests e2e logic.
```bash
# Unit test DB schemas & profile utilities fast
pnpm vitest main/database --watch
```

## 4. Bootstrapping Database
The SQLite database file `database.sqlite` will be auto-generated upon the first invocation in development mode using SQL migrations or `db.pragma('journal_mode = WAL');` defaults in `main/database/index.ts`. No manual SQL execution required.
