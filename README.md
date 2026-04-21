# CSV Roster Viewer

A Chrome extension that intercepts CSV downloads on allowed domains and opens them as a searchable, sortable table in a new tab — instead of downloading the file.

Built for the Florence Melton School of Adult Jewish Learning to view class roster reports from their Events registration platform.

---

## Features

- **Automatic interception** — CSV downloads from allowed domains open as a table instead of downloading
- **Searchable** — live filter across all columns
- **Sortable** — click any column header to sort ascending/descending
- **Download button** — still get the file if you need it
- **Domain allowlist** — only intercepts CSVs from sites you choose; everything else downloads normally
- **UTF-16 support** — correctly handles CSV files exported by Windows-based platforms (with or without BOM)

---

## Installation (Developer Mode)

1. Download and unzip the extension folder
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the unzipped folder
5. Click the extension icon and choose **Manage allowed domains**
6. Add your platform's domain (e.g. `app.example.com`)

---

## Usage

1. Navigate to your platform and trigger a CSV export
2. Instead of downloading, the file opens in a new tab as a table
3. Use the search box to filter rows
4. Click column headers to sort
5. Click **Download CSV** if you want the original file

---

## Domain Matching

Adding `foo.com` to the allowlist automatically covers all subdomains:
- `foo.com` ✓
- `app.foo.com` ✓
- `admin.foo.com` ✓

No wildcard syntax needed.

---

## Development

See `CHANGELOG.md` for version history and `HISTORY.md` for a full narrative
of the development process, including every approach tried and why.

---

## Chrome Web Store

Pending submission. See `HISTORY.md` for remaining to-do items.

---

## License

MIT
