# CSV Roster Viewer — Project History

This document is a narrative account of the full development of this extension,
including every approach tried, every dead end hit, and the reasoning behind
the final design. It was written from the complete conversation between Seth
Dimbert and Claude (Anthropic) on April 20, 2026.

---

## The Problem

Seth works at the Florence Melton School of Adult Jewish Learning and manages
class registrations through a platform called Events. The platform produces CSV
roster reports. On a Mac in Chrome, clicking a CSV link triggers a download.
On an iPhone in Safari, the browser offers a choice to download or view inline.
The goal: get the same "view inline" behavior in Chrome on the Mac.

---

## Approach 1: Navigation Interception (v1.0)

The first idea was to intercept CSV navigations in Chrome before they became
downloads, using `chrome.tabs.onUpdated` and `chrome.webNavigation.onBeforeNavigate`
to watch for URLs ending in `.csv` and redirect them to a viewer page.

The viewer page fetched the CSV using `fetch()`, parsed it with PapaParse
(loaded from the cdnjs CDN), and rendered it as a sortable, filterable HTML
table with a dark green-accented design.

**Dead end:** Chrome's Content Security Policy (CSP) for extension pages blocks
both external CDN scripts and inline `<script>` blocks. The viewer page failed
to load PapaParse and failed to run any JavaScript at all.

**Error seen:**
```
Loading the script 'https://cdnjs.cloudflare.com/...' violates CSP directive "script-src 'self'"
Executing inline script violates CSP directive 'script-src 'self''
```

---

## Approach 2: Context Menu (v1.1)

Reconsidered the trigger mechanism. Instead of intercepting all CSV navigations
automatically, we added a right-click context menu item ("View CSV") so the
user could opt in per-link. This felt more ergonomic.

**Dead end:** The platform's CSV links are `javascript:;` — they have no real
`href`. The context menu fires before any JavaScript runs, so `info.linkUrl`
is always `"javascript:;"`. There is no URL to fetch.

**Error seen in SW console:**
```
[CSV Viewer] Fetching: javascript:;
Fetch API cannot load javascript:;. URL scheme "javascript" is not supported.
```

The context menu item was kept for sites with real CSV hrefs, but it can't
work for this platform.

---

## Fix: CSP Compliance (v1.3)

Solved the CSP problem by:
1. Downloading PapaParse and bundling it locally as `papaparse.min.js`
   (Note: the build environment couldn't reach cdnjs, so PapaParse was
   ultimately replaced with a hand-rolled CSV parser — see below)
2. Moving all JavaScript out of `viewer.html` into a separate `viewer.js` file
   (CSP allows `<script src="viewer.js">` for local extension files)

---

## Approach 3: Download Interception (v1.4)

Since the platform generates the CSV URL dynamically via JavaScript (hence
the `javascript:;` link), the only viable hook is after the download starts.
Chrome's `chrome.downloads.onCreated` fires when any download begins.

The new flow:
1. User clicks the CSV link on the platform page
2. Platform JavaScript runs, generates the real URL, triggers a download
3. `downloads.onCreated` fires in the background service worker
4. Extension cancels the download and fetches the CSV itself
5. CSV text is stored in `chrome.storage.session` keyed by a timestamp ID
6. Viewer tab opens with `?id=<timestamp>`
7. Viewer reads from session storage and renders the table

**Why session storage instead of passing the URL?** The viewer page is an
extension page. If it tried to `fetch()` the CSV URL directly, the server's
CORS policy would block it (cross-origin request from extension origin). The
background service worker is not subject to CORS restrictions, so it fetches
and stores the data before opening the viewer.

This approach worked.

---

## Domain Allowlist (v1.5)

Automatic interception of all CSV downloads felt too aggressive — Seth didn't
want every CSV from every site going through the viewer. We added:

- A domain allowlist stored in `chrome.storage.sync`
- Interception only fires if the download's initiating tab matches an allowed domain
- Subdomain matching: adding `foo.com` covers `app.foo.com`, `admin.foo.com`, etc.
- An options page (`options.html` / `options.js`) for managing the allowlist
- The options page strips protocol/path if someone pastes a full URL
- A popup with a link to the options page

---

## The Reboot Problem (v1.6)

After a Mac reboot, the extension stopped working entirely. The SW console
showed nothing when a CSV download was triggered. Root cause: Chrome's
Manifest V3 service workers are not persistent — they go idle and Chrome
doesn't reliably wake them for `downloads.onCreated` events after a cold start.

**Attempted fix:** Added an offscreen document (`offscreen.html` / `offscreen.js`)
that pings the service worker every 20 seconds to keep it alive. This is the
Google-sanctioned workaround for the MV3 persistent background page removal.

**Outcome:** The reboot problem turned out to be a false alarm. The extension
had been working all along — Seth had been right-clicking and choosing "View CSV"
(which can't work for `javascript:;` links) rather than left-clicking. Normal
left-clicks worked fine. The offscreen keepalive was left in place as a
precaution but may not be necessary.

---

## Detour: declarativeNetRequest (v1.7, abandoned)

While investigating the reboot issue, we tried switching to
`declarativeNetRequest` — Chrome's declarative rules engine that operates at
the browser level without needing a service worker to wake up. The idea was to
intercept responses with `Content-Type: text/csv` and redirect them to the
viewer.

**Two problems:**
1. **HTTP 500:** The platform generates the CSV on demand. `declarativeNetRequest`
   redirected the navigation before the CSV was ready, then the viewer tried
   to fetch the URL a second time, and the server returned 500 on the repeat request.
2. **In-place redirect:** `declarativeNetRequest` redirects happen in the current
   tab, not a new one. The user's platform page got replaced by the viewer.

Reverted to `downloads.onCreated` in v1.8.

---

## The Filter Bug (v1.8–v1.9)

After getting the extension working, Seth reported that the search/filter field
only worked on a single character — typing a second character caused all rows
to disappear.

**Investigation:**
- Confirmed the `input` event was firing correctly with the full accumulated value
- Confirmed `allRows` was intact (206 rows) on every keystroke
- `filterRows("D")` returned 102 matches; `filterRows("Di")` returned 0

**Root cause:** The CSV files from the Events platform are encoded in **UTF-16**
(specifically UTF-16 Little Endian without a Byte Order Mark). The extension
was reading them as UTF-8, which produces null bytes (`\u0000`) between every
character. So "Debra" was stored as `D\u0000e\u0000b\u0000r\u0000a\u0000`.

Searching "D" matched because the string contained the character D.
Searching "Di" matched nothing because the actual sequence was
`D\u0000i\u0000`, not `Di`.

**Why "D" matched at all:** JavaScript's `String.prototype.includes()` is
case-insensitive here (we called `.toLowerCase()` first), and "d" appears as
a raw byte that survives the UTF-8 misread. The single-character match was
essentially a coincidence of how the encoding corruption manifested.

**Note on the focus-preservation detour:** During debugging, we added code to
preserve the search field's focus and cursor position during `renderRows()`,
using `searchEl.setSelectionRange()`. This accidentally triggered additional
`input` events, compounding the problem. That code was removed.

**Fix:** In `background.js`, after fetching the CSV as an `ArrayBuffer`, detect
the encoding before decoding:

1. Check for UTF-16 LE BOM (`0xFF 0xFE`)
2. Check for UTF-16 BE BOM (`0xFE 0xFF`)
3. Check for BOM-less UTF-16 LE: sample the first 64 bytes and count how many
   odd-positioned bytes are `0x00`. If at least 25% are null, it's UTF-16 LE.
4. Otherwise, decode as UTF-8.
5. Strip the BOM character (`\uFEFF`) after decoding if present.

The platform's files are UTF-16 LE **without** a BOM — the sneaky variant.
The heuristic catches it correctly.

**Why no BOM?** The Events platform was likely built on Windows software that
defaults to UTF-16 but omits the BOM — a common Windows-era quirk. Most modern
software uses UTF-8; UTF-16 without a BOM is unusual enough that it wasn't
anticipated.

---

## Version Tracking Problem

Several rounds of fixes were shipped as the same version number (1.8) because
the manifest wasn't being bumped. This made it impossible to confirm whether
Chrome had loaded the new code. From v2.0 onward, version numbers are bumped
with every release.

Additionally, several Python `str.replace()` edits to `background.js` silently
failed because the search string didn't exactly match the file content (likely
due to encoding of special characters in the BOM-strip regex). The fix was to
rewrite `background.js` from scratch using `cat >` rather than patching.

---

## Icon Design (v2.1)

Several icon concepts were explored:
- Plain spreadsheet table
- Bold "CSV" text with table rows beneath
- Diamond badge with CSV inside
- Folded document with CSV badge
- Magnifying glass over CSV text
- **Browser window with bold CSV overlay** ← chosen

The chosen design shows a minimal browser chrome (traffic light buttons,
address bar showing `.csv`, toolbar divider) with a faint alternating-row
table grid behind a large bold "CSV" in bright green (`#86efac`). The dark
background is `#0f1117` matching the viewer's own color scheme.

Icons generated at 16×16, 48×48, and 128×128 px using `cairosvg`.

---

## What's Left (as of v2.1)

For Chrome Web Store submission:
- Privacy policy
- Store listing name and description
- Screenshots
- Category (likely "Productivity")
- Optional homepage URL

The company already has a Google Developer account used for an eBook app,
so the $5 registration fee should already be paid.

---

## File Structure

```
csv-viewer-extension/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker: download interception, encoding detection, fetch
├── viewer.html         # Viewer page markup and styles
├── viewer.js           # Viewer logic: CSV parsing, table render, sort, filter
├── options.html        # Domain allowlist settings page
├── options.js          # Allowlist management logic
├── popup.html          # Toolbar popup
├── popup.js            # Opens options page
├── offscreen.html      # Keepalive document
├── offscreen.js        # Pings service worker every 20s
├── icon16.png          # Toolbar icon
├── icon48.png          # Extensions page icon
├── icon128.png         # Web Store icon
├── papaparse.min.js    # Bundled (empty placeholder — not used, parser is hand-rolled)
├── CHANGELOG.md        # Version history (not included in zip)
└── HISTORY.md          # This file (not included in zip)
```

---

## Key Technical Decisions Summary

| Decision | Reason |
|---|---|
| `downloads.onCreated` not `declarativeNetRequest` | Platform generates CSV on demand; double-fetch causes 500 |
| Background fetch, not viewer fetch | Viewer page is cross-origin; CORS blocks direct fetch |
| `chrome.storage.session` for handoff | Passes large CSV text from SW to viewer page safely |
| Hand-rolled CSV parser, not PapaParse | CSP blocks external CDN scripts in extension pages |
| UTF-16 heuristic detection | Platform exports BOM-less UTF-16 LE; can't rely on BOM alone |
| Domain allowlist | User doesn't want all CSVs intercepted, only from specific platform |
| Offscreen keepalive | MV3 service workers go idle; keepalive prevents missed download events |
