# Phase 1: Data Model

## Core Database Schema (SQLite)

### Table: `profiles`
The main identity instance representing an isolated browser.

| Column | Type | Description | Index? | Constraints |
|--------|------|-------------|--------|-------------|
| `id` | TEXT | UUID string (v4) | PRIMARY KEY | Not Null |
| `name` | TEXT | Display name string | - | - |
| `fingerprint_seed`| INTEGER | Derived entropy value (1-999999) | - | - |
| `proxy_id` | TEXT | Foreign Key to `proxies` table | INDEX | Default Null |
| `user_agent` | TEXT | Overridden explicit User-Agent | - | - |
| `timezone` | TEXT | Timezone ex: `Asia/Ho_Chi_Minh` | - | Default `UTC` |
| `note` | TEXT | Quick user note | - | - |
| `is_pinned` | BOOLEAN | Pin to top of list | INDEX | Default `0` |
| `last_opened` | DATETIME | ISO string or Unix Epoch | INDEX | - |
| `group_id` | TEXT | Foreign Key to `groups` table | INDEX | Default Null |
| `created_at`| DATETIME | ISO string or Unix Epoch | - | Default Current | 
| `updated_at`| DATETIME | ISO string tracking modifications | - | - |

---

### Table: `groups`
Folder or category categorization of profiles.

| Column | Type | Description | Index? | Constraints |
|--------|------|-------------|--------|-------------|
| `id` | TEXT | UUID string | PRIMARY KEY | Not Null |
| `name` | TEXT | Group name | UNIQUE | Not Null |
| `created_at`| DATETIME| ISO string or Unix Epoch | - | - |

---

### Table: `proxies`
Central proxy configurations. Profiles link here.

| Column | Type | Description | Index? | Constraints |
|--------|------|-------------|--------|-------------|
| `id` | TEXT | UUID string | PRIMARY KEY | Not Null |
| `protocol` | TEXT | `HTTP`, `HTTPS`, `SOCKS4`, `SOCKS5` | - | Not Null |
| `host` | TEXT | IP address or Hostname | - | Not Null |
| `port` | INTEGER| 1-65535 | - | Not Null |
| `username` | TEXT | Proxy Authentication Username | - | - |
| `password` | TEXT | Proxy Authentication Password | - | - |
| `alias` | TEXT | Human readable name/label | - | - |
| `last_tested`| DATETIME| Timestamp of last connection check| - | - |

## Business Logic Models / Memory State

### Interface: `ProfileRuntimeState`
Kept in Main process memory / IPC reactivity.

```typescript
export interface ProfileRuntimeState {
  profileId: string;
  status: 'stopped' | 'launching' | 'running' | 'error';
  pid: number | null;
  debuggingPort: number | null; // For external automation
  startTime: number | null;
  errorMessage?: string;
  mappedProxyChainUrl?: string; // The dynamically generated localhost tunnel proxy URL
}
```

### Interface: `SysMetrics`
System-wide metrics broadcast periodically via IPC.

```typescript
export interface SysMetrics {
  cpuUsagePct: number;
  memoryUsageMb: number;
  totalProfilesRunning: number;
  licenseValidUntil: string | null;
}
```
