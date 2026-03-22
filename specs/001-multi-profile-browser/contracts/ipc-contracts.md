# Phase 1: IPC Contracts

## Main -> Renderer Communication
Exposed via `window.api` (Context Bridge).

### `profiles:start`
**Type**: Invoke (Renderer to Main -> Promise Resolve)
**Payload**: `(profilesIdList: string[])`
**Purpose**: Attempting to launch Chromium instances. Checks proxy connectivity, spins up `proxy-chain`, spawns isolated processes, returns success/fail states.

### `profiles:stop`
**Type**: Invoke
**Payload**: `(profilesIdList: string[])`
**Purpose**: Graceful SIGTERM or SIGKILL on running Chromium processes, destroying related proxy-chains to avoid port leakage.

### `profiles:bulkUpdate`
**Type**: Invoke
**Payload**: `(profileIds: string[], updates: Partial<ProfileRow>)`
**Purpose**: Database bulk action handler for Groups/Note changes.

### `profiles:importZip`
**Type**: Invoke (No args required; uses Native Dialog fallback)
**Payload**: `()` -> returns `boolean` success
**Purpose**: Restores user data.

### `profiles:exportZip`
**Type**: Invoke
**Payload**: `(profileId: string)`
**Purpose**: Saves profile data dir as a Zip file. Allows native file saving path selection UI.

## Renderer Notifications
Exposed via `window.api.on()` (Context Bridge listener subscriptions).

### `status:profileChanged`
**Event Handler Payload**: `(state: ProfileRuntimeState)`
**Purpose**: Main process async status broadcast when an instance spins up, errors out, or closes natively from the taskbar.

### `status:sysMetrics`
**Event Handler Payload**: `(metrics: SysMetrics)`
**Purpose**: Polled system CPU/RAM usage sent back to UI.

### `ui:alerts`
**Event Handler Payload**: `({level: 'info'|'warning'|'error', text: string})`
**Purpose**: Sending application errors down to the Renderer (Toaster notifications), e.g., "Proxy connection timed out on Profile X".
