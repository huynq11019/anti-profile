---
page: settings
---
Design the **Settings** page for the Anti-Detech browser manager app. This is the full page view (replacing main content area to the right of the 240px glassmorphism sidebar, below the 60px header).

**DESIGN SYSTEM (REQUIRED — Cyber Shield):**
- Background: `#0c0e12` (surface)
- Main content area: `#111318` (surface_container_low)
- Cards/panels: `#171a1f` (surface_container)
- Elevated inputs/modals: `#1d2025` (surface_container_high)
- Primary Cyan gradient: `#81ecff` → `#00d4ec` (135deg)
- Text primary: `#f6f6fc`, Text secondary: `#aaabb0`
- Font: Inter exclusively
- No hard divider lines — use tonal shifts between surface tiers
- Rounded corners: 8px (ROUND_EIGHT)

**PAGE STRUCTURE:**

Page header section (~80px):
- Title: "Global Settings" headline-sm
- Subtitle: "Configure application behavior, licenses, and API keys" body-md gray

Main Content Area:
A clean, center-aligned single column max-width 800px.
Split into three distinct cards/panels (`surface_container` #171a1f).

**Card 1: License & Subscription**
- Header: "License Details"
- Icon/Badge: "Active" green cyan pill
- Plan: "Anti-Detech Pro Plan" (large text)
- Expiry date: "Valid until: Dec 31, 2027"
- Primary CTA: "Renew License" (outline button)

**Card 2: General Application Settings**
- Header: "Application Settings"
- Row 1 (Toggle): "Launch on startup" (Toggle switch active cyan)
- Row 2 (Toggle): "Hardware Acceleration" (Toggle switch active cyan)
- Row 3 (Select): "Default Browser Core" (Dropdown: Chrome v114, Chrome v116, Firefox)
- Row 4 (Text Input): "Local Data Directory" (Input box showing `/Users/helen/Library/Application Support/AntiDetech`, with a "Browse" secondary button next to it)

**Card 3: External Integrations / API**
- Header: "API Configuration"
- Description: "Manage your local API port for external script integration (Playwright/Puppeteer)"
- Row 1 (Input): "Local API Port" (input box: `9222`)
- Row 2 (API Key): "Integration Key" (Masked input `••••••••••••••••`, copy icon button, and "Regenerate" outline button)

Bottom of page: 
- "Save Changes" cyan CTA button (right aligned)
- "Factory Reset" red danger link/ghost button (left aligned)

Color Palette: #0c0e12 bg, #171a1f cards, #81ecff primary, #aaabb0 secondary. No hard borders. Toggle switches should look modern with cyan track when active.
