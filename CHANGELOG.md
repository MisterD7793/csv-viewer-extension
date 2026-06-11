# CSV Roster Viewer — Changelog

## v2.6 (current)
- Added Export/Import to the Settings page — saves your domain list as a JSON file you can re-import after reinstalling the extension
- Replaced the feature announcement banner with a centered modal popover
- "Don't show this again" checkbox in modal footer — dismissing without it checked allows the modal to reappear next session

## v2.5
- Replaced native browser checkboxes with hover-reveal SVG line-art buttons matching the copy icon style
- Column select buttons moved to the end of each header (after the copy icon)
- Added a dismissable feature announcement banner

## v2.4
- Added row numbers and selection checkboxes to a new leftmost # column
- Added column selection checkboxes to each header
- Added "Copy Selected" toolbar button — copies the intersection of selected rows × columns as tab-separated text

## v2.3
- Added copy-to-clipboard buttons to the viewer
- Column header: hover to reveal a copy icon that copies all visible column values (newline-separated)
- Row: hover to reveal a copy icon that copies all row values (tab-separated, pastes cleanly into Excel or Sheets)
- Green flash confirmation on copy

## v2.2
- Published to GitHub for distribution
- Added complete user documentation: installation, usage, Developer Mode explainer, uninstallation

## v2.1
- Added icon at 16px, 48px, and 128px
- Icon design: browser window with bold CSV overlay on dark theme

## v2.0
- Fixed UTF-16 encoding detection (with and without BOM)
- Background fetch now reads raw bytes and selects correct decoder (UTF-8, UTF-16 LE, UTF-16 BE)
- Handles BOM-less UTF-16 LE via null-byte heuristic sampling

## v1.9
- Bumped version number (no code changes — caught version tracking error)

## v1.8
- Reverted to downloads.onCreated approach (declarativeNetRequest caused HTTP 500 and in-place redirect)
- Added empty row filtering at parse time and after header split

## v1.7
- Attempted declarativeNetRequest redirect approach (abandoned — see v1.8)

## v1.6
- Added offscreen document keepalive to prevent service worker from going idle
- Added onStartup listener to re-create offscreen document after reboot

## v1.5
- Added domain allowlist — CSV downloads only intercepted on allowed domains
- Added options page (accessible from popup) to manage allowed domains
- Domains match subdomains automatically (e.g. foo.com covers app.foo.com)
- Popup updated with link to settings

## v1.4
- Switched from context menu to downloads.onCreated interception
- Diagnosed that platform links are javascript:; with no real href
- Background worker fetches CSV and stores in chrome.storage.session
- Viewer reads from session storage instead of fetching directly (fixes CORS)

## v1.3
- Moved all JS out of viewer.html into viewer.js (fixes CSP inline script violation)
- Replaced PapaParse CDN with hand-rolled CSV parser (fixes CSP external script violation)
- CSV parser handles quoted fields, embedded commas, and Windows line endings (CRLF)

## v1.2
- Attempted background fetch via service worker with session storage (first CORS fix attempt)
- Added download button using Blob URL

## v1.1
- Switched from automatic interception to right-click context menu ("View CSV")
- Diagnosed that approach fails for javascript:; links

## v1.0
- Initial release
- Intercepted CSV navigations via tabs.onUpdated and webNavigation
- Viewer page with sortable/filterable table, search highlighting, row count
- Download CSV button
