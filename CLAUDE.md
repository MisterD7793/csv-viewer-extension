# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Chrome Extension (Manifest V3)** that intercepts CSV downloads on a user-configured domain allowlist and displays them as an interactive, searchable, sortable HTML table in a new tab — instead of downloading the file. Built for the Florence Melton School of Adult Jewish Learning to view class roster exports.

## Development Commands

There is no build step. This is vanilla JavaScript with no npm, no bundler, and no test runner.

**Load in Chrome for testing:**
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and select this directory

**Reload after changes:** Click the reload icon on the extension card in `chrome://extensions`.

## Architecture

The extension uses four components that communicate via Chrome APIs:

### Background Service Worker (`background.js`)
The core of the extension. It:
- Listens for CSV downloads via `chrome.downloads.onCreated` (not `declarativeNetRequest` — the platform generates CSVs on demand and a double-fetch causes HTTP 500)
- Fetches the CSV as binary from the background context (not the viewer tab — viewer is an extension page and CORS blocks cross-origin fetch)
- Detects encoding: UTF-16 LE/BE with BOM, BOM-less UTF-16 LE via null-byte heuristic, or UTF-8
- Stores decoded CSV text in `chrome.storage.session` keyed by timestamp
- Opens `viewer.html?id=<timestamp>` in a new tab
- Checks the domain allowlist (stored in `chrome.storage.sync`) before intercepting

### Viewer Page (`viewer.html` + `viewer.js`)
- Reads CSV from session storage using the `id` URL param
- Hand-rolled CSV parser (no PapaParse — CSP blocks CDN scripts in extension pages)
- Renders a table with sticky header, live search/highlight, click-to-sort columns, row count, and a re-download button

### Options Page (`options.html` + `options.js`)
- Domain allowlist management stored in `chrome.storage.sync`
- Subdomain matching: adding `foo.com` also matches `*.foo.com`
- Strips protocol/path if user pastes a full URL

### Offscreen Document (`offscreen.html` + `offscreen.js`)
- Pings the service worker every 20 seconds to prevent MV3 idle shutdown after system reboot
- Without this, the service worker can miss download events

## Key Implementation Notes

**Encoding detection** (`background.js` ~line 53): BOM check first, then a heuristic sampling the first 64 bytes to detect BOM-less UTF-16 LE (platform exports this format without a BOM).

**CSV parsing** (`viewer.js` ~line 3): State-machine parser handling quoted fields, embedded commas, escaped quotes (`""`), and both `\r\n` / `\n` line endings.

**Domain matching** (`background.js` ~line 26): `tabDomain === allowedDomain || tabDomain.endsWith('.' + allowedDomain)`

**Why `downloads.onCreated` not `declarativeNetRequest`**: The platform generates CSVs on-demand; intercepting the request and re-fetching causes HTTP 500. The download event fires after the platform has served the file, so the background fetch succeeds.
