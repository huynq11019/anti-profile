# Feature Specification: Multi-Profile Browser Manager

**Feature Branch**: `001-multi-profile-browser`  
**Created**: 2026-03-22  
**Status**: Draft  

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Profile Creation and Isolation (Priority: P1)

Users need to capture and separate their online identities into distinct, isolated profiles so that actions in one account do not affect others (e.g., social media or e-commerce accounts).

**Why this priority**: Core value of the application; without isolation, the software cannot protect against linked account bans.

**Independent Test**: Can be fully tested by creating two distinct profiles, logging into a different account on each, and confirming that cookies/sessions do not leak between them.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they create a new profile with a set of parameters, **Then** a new isolated environment is created and saved.
2. **Given** two running profiles, **When** a user browses a website on one, **Then** the local storage, cache, and cookies remain completely invisible to the second profile.

---

### User Story 2 - Consistent Fingerprint Management (Priority: P1)

Users must present a unique but consistent hardware and software fingerprint (Canvas, WebGL, Audio, CPU, RAM) every time they open a specific profile, to avoid triggering anti-bot flags due to changing device metrics.

**Why this priority**: Prevents bans from strict anti-fraud platforms detecting sudden device changes for the same account.

**Independent Test**: Can be fully tested by opening a profile, checking a fingerprinting site (like BrowserLeaks or CreepJS), closing it, reopening it, and verifying the exact same hardware/software fingerprints are presented.

**Acceptance Scenarios**:

1. **Given** a created profile with a specific fingerprint seed, **When** the profile is launched, **Then** the browser presents the assigned fingerprint metrics.
2. **Given** a profile opened on multiple different days, **When** it visits a fingerprint checker, **Then** the metrics (Canvas, WebGL, etc.) remain identical.

---

### User Story 3 - Proxy Network Integration & Localization (Priority: P2)

Users need to assign unique IP addresses (via HTTP/Socks5 proxies) to each profile, including those requiring username/password authentication. The profile's timezone and language should automatically match the proxy's location.

**Why this priority**: Essential for masking the user's real location and ensuring the IP matches the assigned profile identity.

**Independent Test**: Can be fully tested by assigning a proxy to a profile, launching it, and checking the detected IP, timezone, and language on a geolocation testing site.

**Acceptance Scenarios**:

1. **Given** a profile configuration, **When** a user inputs proxy details with authentication, **Then** the system successfully connects the profile through that proxy.
2. **Given** a proxy located in a specific country, **When** the profile is launched, **Then** the browser's timezone and language automatically match the proxy's origin.

---

### User Story 4 - Profile Status Management (Priority: P2)

Users need a visual dashboard to easily start, stop, and monitor the active status of multiple profiles simultaneously.

**Why this priority**: Critical for operational efficiency when managing dozens or hundreds of accounts.

**Independent Test**: Can be fully tested by starting multiple profiles and observing the dashboard accurately reflecting which ones are "Running" vs "Closed".

**Acceptance Scenarios**:

1. **Given** a list of profiles, **When** the user clicks start on a profile, **Then** the status updates to "Running" and the browser window opens.
2. **Given** a running profile, **When** the browser window is closed externally or via the dashboard, **Then** the status promptly updates to "Closed".

---

### User Story 5 - External Automation Support (Priority: P3)

Users executing automated tasks need to connect their own scripts to the running profiles to automate repetitive actions while maintaining the anti-detect protections.

**Why this priority**: Allows advanced users to scale their operations via automation without triggering bot detection systems.

**Independent Test**: Can be fully tested by launching a profile and successfully connecting a basic external script to navigate to a page and read its title.

**Acceptance Scenarios**:

1. **Given** a running profile configured for automation, **When** an external script attempts to connect, **Then** the connection is accepted and the script can drive the browser.
2. **Given** an automated profile, **When** tested against bot-protection systems (e.g., Cloudflare Turnstile), **Then** the automation successfully bypasses the checks.

---

### User Story 6 - Bulk Profile Operations (Priority: P2)

Users managing hundreds of accounts need to perform common management actions (open, close, change proxy, assign group, delete) on multiple profiles at once instead of repeating actions one by one.

**Why this priority**: Directly impacts operational efficiency at scale — the core use case for power users.

**Independent Test**: Can be fully tested by selecting 5+ profiles and applying a single bulk action (e.g., "Mở Hàng Loạt"), then confirming all selected profiles perform the action correctly.

**Acceptance Scenarios**:

1. **Given** a user selects multiple profiles via checkboxes, **When** they click "Mở Hàng Loạt" (Bulk Open), **Then** all selected profiles open successfully.
2. **Given** a user selects multiple profiles, **When** they apply "Đổi Proxy (Mỗi acc 1 Proxy)" from a list, **Then** each selected profile is assigned one unique proxy from that list in order.
3. **Given** a user selects multiple profiles, **When** they apply "Đổi Proxy (Chung 1 Proxy)", **Then** all selected profiles are assigned the same proxy.

---

### User Story 7 - Cookie Management (Priority: P2)

Users need to import/export cookies for a profile to restore sessions quickly, avoiding repeated manual logins and preserving logged-in states.

**Why this priority**: Saves significant time and reduces the risk of triggering login-based bot detection.

**Independent Test**: Can be tested by exporting a cookie from a logged-in profile, creating a fresh profile, importing the cookie, and confirming the session is active on the target website.

**Acceptance Scenarios**:

1. **Given** a profile, **When** the user selects "Paste (Nạp) Cookie", **Then** the cookie data is imported and the profile reflects the active session on the next launch.
2. **Given** a running profile with active sessions, **When** the user selects "Copy (Lấy) Cookie", **Then** the raw cookie data is copied and can be saved for future use.

---

### User Story 8 - Group & Proxy Management (Priority: P2)

Users need dedicated management pages to organize profiles into logical groups and manage a centralized list of proxies, so they can efficiently organize and reuse resources across many profiles.

**Why this priority**: As the number of profiles grows, categorization and proxy reuse become critical for maintainability.

**Independent Test**: Can be fully tested by creating groups, assigning profiles to them, filtering by group, and confirming only the correct profiles appear.

**Acceptance Scenarios**:

1. **Given** the user is on the Group Management page, **When** they create a new group and assign profiles to it, **Then** the profiles are visible under that group when filtered.
2. **Given** the user is on the Proxy Management page, **When** they add a proxy to the list, **Then** the proxy becomes available for selection when assigning proxies to profiles.

---

### User Story 9 - Profile Import/Export (Priority: P3)

Users need to back up profiles or migrate them to a different machine by exporting them as ZIP archives, and importing them back without losing any data.

**Why this priority**: Data portability and backup are important safeguards for users with long-established accounts.

**Independent Test**: Can be tested by exporting a profile to ZIP, deleting the profile, importing the ZIP, and confirming the profile data is fully restored.

**Acceptance Scenarios**:

1. **Given** a user right-clicks a profile and selects "Xuất Profile ra file ZIP", **Then** a ZIP file is created containing all profile data.
2. **Given** a ZIP file was previously exported, **When** the user selects "Nhập ZIP", **Then** the profile is fully restored with all original settings.

---

### User Story 10 - System Resource & License Monitoring (Priority: P3)

Users need to see real-time system resource usage (CPU, RAM) and their license validity status in the dashboard, so they can plan their workload and know when to renew.

**Why this priority**: Prevents unexpected performance degradation and service interruptions.

**Independent Test**: Can be tested by opening multiple profile sessions and observing the CPU/RAM indicators rise accordingly.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** the user opens several profiles, **Then** the CPU and RAM usage percentages in the status bar update in real-time.
2. **Given** the user's license is active, **When** they check the status bar, **Then** the license expiry date is clearly displayed.

### Edge Cases

- What happens when a configured proxy goes offline or times out during profile launch?
- How does the system handle an unexpected browser crash or strict external termination (does the UI status update correctly)?
- What happens if the local disk runs out of space while saving profile data?
- How does the system handle conflicting automation port assignments if multiple profiles are launched simultaneously?
- What happens when the user tries to bulk-open more profiles than the system has resources to run?
- What happens if a cookie import file is malformed or from an incompatible browser version?
- What happens when a ZIP export is interrupted mid-way (e.g., disk full)?
- What is the behavior when the user's license expires while profiles are actively running?

## Requirements *(mandatory)*

### Functional Requirements

#### Profile Management (Quản lý Profile)

- **FR-001**: System MUST allow users to create a single new profile with configurable name, group, note, proxy, and fingerprint settings.
- **FR-002**: System MUST support bulk profile creation ("Tạo Hàng Loạt"), generating multiple profiles with auto-incremented names in a single action.
- **FR-003**: System MUST isolate each profile's browsing data (cookies, cache, local storage, history) completely from other profiles and the host operating system.
- **FR-004**: System MUST apply consistent, unique digital fingerprints (Canvas, WebGL, Audio, CPU, RAM) to each profile based on a persistent seed value.
- **FR-005**: Users MUST be able to rename a profile via a right-click context menu without reopening full settings.
- **FR-006**: Users MUST be able to pin profiles to the top of the list ("Ghim Lên Đầu") for quick access.
- **FR-007**: Users MUST be able to add, edit, and quickly update a short note ("Ghi Chú Nhanh") on any profile from the context menu.
- **FR-008**: Users MUST be able to open the profile's local storage directory on the host filesystem directly from the context menu ("Mở Thư Mục Ổ Cứng").
- **FR-009**: System MUST record and display the last-opened date/time for each profile in the profile list.
- **FR-010**: System MUST display real-time status ("Sẵn sàng" / "Đang mở") for each profile in the list and update it immediately upon open/close.

#### Bulk Operations (Thao Tác Hàng Loạt)

- **FR-011**: Users MUST be able to select multiple profiles simultaneously via checkboxes and apply bulk actions.
- **FR-012**: System MUST support bulk open ("Mở Hàng Loạt") for a user-selected set of profiles.
- **FR-013**: System MUST support closing all currently running profiles at once ("Đóng Tất Cả").
- **FR-014**: System MUST support a synchronized action mode ("Đồng Bộ Thao Tác") that mirrors input actions across multiple running profiles simultaneously.

#### Search, Filter & Sort (Tìm kiếm & Lọc)

- **FR-015**: Users MUST be able to search profiles by name or note in real-time.
- **FR-016**: Users MUST be able to filter the profile list by group.
- **FR-017**: Users MUST be able to sort the profile list (e.g., by newest, name, last-opened).
- **FR-018**: The dashboard status bar MUST display total profile count, number of currently running profiles, and number of currently selected profiles.

#### Cookie Management (Quản lý Cookie)

- **FR-019**: Users MUST be able to import ("Nạp Cookie") cookies into a profile from the main toolbar or context menu.
- **FR-020**: Users MUST be able to copy ("Copy/Lấy Cookie") the current cookies from a profile to the clipboard.
- **FR-021**: System MUST support bulk cookie import via directory scan ("Quét Thư Mục") to automatically match and load cookies into corresponding profiles.

#### Extension & Bookmark Management

- **FR-022**: Users MUST be able to install browser extensions into individual or selected profiles ("Cài đặt Extensions").
- **FR-023**: Users MUST be able to add or remove bookmarks for individual profiles ("Bơm/Xóa Bookmark").

#### Import & Export (Nhập / Xuất)

- **FR-024**: Users MUST be able to export a profile as a ZIP archive ("Xuất Profile ra file ZIP") for backup or migration.
- **FR-025**: System MUST support importing profiles from a ZIP archive ("Nhập ZIP"), fully restoring all profile data and settings.

#### Proxy Management (Quản lý Proxy)

- **FR-026**: System MUST support HTTP and Socks5 proxies, including those requiring Username/Password authentication.
- **FR-027**: System MUST automatically sync the profile's timezone and language settings with the assigned proxy's location.
- **FR-028**: Users MUST be able to assign a single shared proxy to multiple selected profiles at once ("Đổi Proxy - Chung 1 Proxy").
- **FR-029**: Users MUST be able to assign a unique proxy to each selected profile from a list ("Đổi Proxy - Mỗi acc 1 Proxy"), distributed one-to-one.
- **FR-030**: Users MUST be able to remove ("Gỡ Proxy") the proxy from one or multiple profiles, reverting them to a direct connection.
- **FR-031**: System MUST provide a dedicated Proxy Management page to add, edit, delete, and organize a centralized proxy list.

#### Group Management (Quản lý Nhóm)

- **FR-032**: System MUST provide a dedicated Group Management page to create, rename, and delete profile groups.
- **FR-033**: Users MUST be able to reassign a profile to a different group via the context menu ("Đổi Nhóm / Category").

#### Automation Support

- **FR-034**: System MUST provide an interface/port for external automation tools (e.g., Playwright, Puppeteer) to connect to running profiles.
- **FR-035**: System MUST bypass common fingerprinting and bot-detection systems while automation is active.

#### System Monitoring & Licensing

- **FR-036**: The application MUST display real-time CPU and RAM usage in the status bar.
- **FR-037**: The application MUST display the current license validity status and expiry information in the status bar.

### Key Entities

- **Profile**: Represents a unique digital identity with a name, group, note, pinned status, last-opened timestamp, running status, fingerprint seed, and an optional linked proxy.
- **Group**: A logical label used to organize and filter profiles (e.g., "Default", "Facebook", "Shopee").
- **Proxy**: A reusable network routing configuration (Protocol, Host, Port, Username, Password) maintained in a centralized proxy list and assignable to profiles.
- **Cookie**: Session data that can be imported into or exported from a profile to preserve authenticated sessions.
- **License**: A record of the user's software entitlement including validity period and active status.

### Dependencies and Assumptions

- **Dependencies**: Requires valid proxy resources to be provided by the user (the application itself does not supply proxies).
- **Dependencies**: Requires ongoing updates to the fingerprinting engine to combat newly developed detection methods.
- **Assumptions**: The host machine has sufficient RAM and CPU to run multiple Chromium instances concurrently.
- **Assumptions**: Users have a basic understanding of proxies and how browser fingerprints work.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Profiles score 100% uniqueness/trust on standard fingerprint testing tools (CreepJS, PixelScan, BrowserLeaks) without leaking the host OS metrics.
- **SC-002**: Automated scripts running through the profiles can successfully pass Cloudflare Turnstile and Akamai bot protections in at least 95% of attempts.
- **SC-003**: The dashboard can seamlessly manage and display the status of at least 500 profiles without notable UI degradation or lag.
- **SC-004**: Users can successfully route traffic through authenticated proxies with a 100% connection success rate assuming the proxy is alive.
- **SC-005**: The system successfully prevents any data leakage (cookies/sessions) between 100% of concurrently running profiles.

## Technical Architecture *(Strategy 1: Electron + Node.js)*

This project follows the industry standard for Antidetect Browsers, ensuring high compatibility with Chromium fingerprints and robust system integration.

### Tech Stack
- **Framework**: Electron (Main & Renderer process architecture).
- **Frontend**: React.js / Vue 3 + Tailwind CSS (High-fidelity, responsive dashboard).
- **Backend (Logic)**: Node.js (Integrated within Electron for system-level operations).
- **Database**: SQLite (via `better-sqlite3`) for lightweight, single-file local data storage.
- **Browser Control**: Node.js `child_process` (spawn/exec) to launch customized Chromium instances with specific flags.
- **Proxy Handling**: `proxy-chain` for local tunneling (supporting proxies with Auth).

### Project Structure (Physical)
- `/app.exe`: Main application executable.
- `/browser/chrome.exe`: The core customized Ungoogled Chromium binary.
- `/profiles/{id}/`: Isolated user data directories for each unique identity.
- `/database.sqlite`: Centralized storage for profile configurations and proxy lists.

### Database Schema (Profiles Table)
```sql
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,          -- UUID/Unique ID
    name TEXT,                    -- Profile display name
    fingerprint_seed INTEGER,      -- Seed for hardware/software spoofing
    proxy_server TEXT,            -- IP:PORT
    proxy_auth TEXT,              -- user:pass (encrypted)
    user_agent TEXT,              -- Custom UA string
    timezone TEXT,                 -- e.g., "Asia/Ho_Chi_Minh"
    last_opened DATETIME,         -- Timestamp tracking
    group_id TEXT                 -- Reference to groups table
);
```

## Implementation Example (Core Launch Logic)

The following Node.js snippet demonstrates how the system triggers an isolated browser instance with assigned fingerprints.

```javascript
const { spawn } = require('child_process');
const path = require('path');

/**
 * Launches a specific browser profile with isolated data and fingerprint
 * @param {Object} profile - Configuration object from Database
 */
function launchProfile(profile) {
    const chromePath = path.join(__dirname, 'browser', 'chrome.exe');
    const userDataDir = path.join(__dirname, 'profiles', profile.id);

    // Build Arguments for the custom Chromium engine
    const args = [
        `--user-data-dir=${userDataDir}`,
        `--fingerprint=${profile.fingerprint_seed}`,
        `--lang=vi-VN,vi;q=0.9`,
        `--timezone=${profile.timezone || 'UTC'}`,
        // Disable features that might leak real identity
        '--disable-encryption', 
        '--restore-last-session'
    ];

    if (profile.proxy_server) {
        args.push(`--proxy-server=${profile.proxy_server}`);
    }

    const browserProcess = spawn(chromePath, args, {
        detached: true, 
        stdio: 'ignore'
    });

    browserProcess.unref(); // Allow the main app to keep running independently
    console.log(`Launched Profile: ${profile.name} (ID: ${profile.id})`);

    // TODO: Maintain a PID map to track "Running" status in the UI
}
```

## Key Technical Challenges & Solutions
- **Proxy Auth**: Use `proxy-chain` to create a local anonymous tunnel that forwards to authenticated upstream proxies.
- **Duy trì Trạng thái (Running Status)**: Capture the `pid` from `spawn` and listen for the `exit` event to toggle UI buttons from "Running" to "Start".
- **Storage Management**: Implement a "Clean Cache" utility to prevent profile folders from growing indefinitely (targeting the `Cache` and `Code Cache` subfolders).
