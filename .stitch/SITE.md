# Anti-Detech Browser Manager — Site Vision

## 1. Project Overview

**Product**: Anti-Detech — Desktop anti-fingerprint browser manager  
**Tech Stack (UI)**: Electron + React 18 + Tailwind CSS  
**Stitch Project ID**: `1426008087346202043`  
**Design System**: "Cyber Shield" (obsidian dark, cyan accent, Inter font)  
**Device Type**: DESKTOP (2560x2048 canvas)

## 2. Design Philosophy

Action-First Dashboard. Users manage hundreds of browser profiles — every action must be one click away. The design rejects traditional "boxed-in" SaaS UI for an editorial approach: vast negative space contrasted against hyper-dense data clusters. No harsh divider lines; surfaces defined by tonal shifts.

## 3. Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `surface` | `#0c0e12` | Global background |
| `surface_container_low` | `#111318` | Main content area |
| `surface_container` | `#171a1f` | Cards |
| `surface_container_high` | `#1d2025` | Modals, elevated panels |
| `surface_container_highest` | `#23262c` | Inputs |
| `surface_bright` | `#292c32` | Row hover state |
| `primary` | `#81ecff` | Cyan accent, gradient start |
| `primary_dim` | `#00d4ec` | Gradient end |
| `on_surface` | `#f6f6fc` | Primary text |
| `on_surface_variant` | `#aaabb0` | Secondary text |
| `tertiary` | `#c5ffc9` | Active/running status |
| `error` | `#ff716c` | Error/delete |

## 4. Sitemap

- [x] `dashboard` — Action-First Profile Management Dashboard (main table)
- [x] `create-profile-modal` — Create New Profile modal (720px, 2-col form)
- [x] `proxy-manager` — Proxy list management page
- [x] `automation` — Automation scripts & running tasks view
- [x] `cookies` — Cookie import/export management
- [ ] `extensions` — Browser extension management
- [ ] `logs` — System & automation logs viewer
- [x] `settings` — App settings (license, general config)

## 5. Roadmap (Pending Screens)

*(All core MVP screens have been designed!)*

## 6. Creative Freedom Ideas

- Profile detail drawer (slides in from right) showing full fingerprint breakdown
- Bulk operation confirmation dialog with progress bar
- Proxy health status dashboard mini-widget in sidebar
- Dark mode onboarding splash screen with animated fingerprint graphic

## 7. Navigation Structure

```
Header (60px): Logo | Search | + Create Profile | Notifications | Settings | Avatar
Sidebar (240px glassmorphism):
  Dashboard ← Active screen
  Profiles
  Proxy Manager
  Automation
  Cookies
  Extensions
  Logs
  Settings
Footer: Anti-Detech © 2026 | Docs | API | Support
```
