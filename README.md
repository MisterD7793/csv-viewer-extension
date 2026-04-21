# CSV Roster Viewer

Managing class rosters often means clicking an export button, waiting for a CSV file to download, finding it in your Downloads folder, and opening it in Excel — just to glance at a list of names. This extension eliminates those steps.

CSV Roster Viewer is a Chrome extension built for the Florence Melton School of Adult Jewish Learning. When you export a report from Events, instead of downloading a file, the data opens instantly in your browser as a clean, interactive table you can search and sort. When you're done, just close the tab. No files pile up in your Downloads folder, and you never have to open Excel.

The extension only intercepts CSV downloads from websites you specifically allow — everything else continues to download normally, exactly as before.

---

## Installation

### Step 1 — Download the extension

1. Go to: https://github.com/MisterD7793/csv-viewer-extension
2. Click the green **Code** button, then click **Download ZIP**
3. Find the ZIP file in your Downloads folder and double-click it to unzip it

### Step 2 — Load it in Chrome

1. Open Chrome and type `chrome://extensions` in the address bar, then press Enter
2. In the top-right corner, turn on **Developer mode**
3. Click **Load unpacked**
4. Navigate to the unzipped folder, open the **csv-viewer-extension** subfolder inside it, and click **Select** (Mac) or **Select Folder** (PC)

The extension will now appear in your list and is ready to configure.

> **About Developer Mode:** Developer mode allows Chrome to load extensions that haven't been submitted to the Chrome Web Store. It is a standard feature built into Chrome and is widely used by developers and organizations distributing internal tools. There are a few things to be aware of:
>
> - **Startup warning:** Each time you launch Chrome with Developer mode on, a yellow banner may appear warning that you're running unpacked extensions. You can dismiss it by clicking the X — it doesn't affect anything.
> - **No automatic updates:** Unlike Web Store extensions, this one won't update itself. To get a newer version, you'd download it again and repeat the installation steps.
> - **Trust:** Because Developer mode bypasses Google's extension review process, you should only load extensions from sources you trust. This extension's full source code is available at the GitHub link above for anyone to inspect.
>
> Developer mode does not weaken Chrome's security in any other way, and you can turn it off at any time — though doing so will disable any unpacked extensions you've loaded.

### Step 3 — Configure your allowed domains

Before the extension will do anything, you need to tell it which websites it should watch for CSV downloads.

1. Click the puzzle piece icon in Chrome's toolbar, then click **CSV Roster Viewer**
2. Click **Open Settings**
3. Type the domain of the site you want to enable (e.g., `events.org`) and click **Add**
4. Repeat for any other sites

> **Tip:** You only need the domain name — no `https://` or trailing slashes. Adding `events.org` also covers subdomains like `reports.events.org`.

---

## Using the Extension

Once a domain is configured, just use that website normally. When you click a link or button that would normally download a CSV file, the extension will automatically open it as an interactive table in a new browser tab instead.

From the table view you can:

- **Search** — type in the search box to filter rows in real time
- **Sort** — click any column header to sort by that column
- **Download** — click the Download button to save the original CSV file if needed

---

## Domain Matching

Adding `events.org` to the allowlist automatically covers all subdomains:
- `events.org` ✓
- `app.events.org` ✓
- `admin.events.org` ✓

No wildcard syntax needed.

---

## Uninstalling

1. Open Chrome and go to `chrome://extensions`
2. Find **CSV Roster Viewer** and click **Remove**
3. If you no longer need Developer mode, toggle it off in the top-right corner of that same page

You can also delete the unzipped extension folder from your computer — the extension stores your domain settings in Chrome, so they'll be removed automatically when you uninstall.

---

## Development

See `CHANGELOG.md` for version history and `HISTORY.md` for a full narrative of the development process, including every approach tried and why.

---

## Chrome Web Store

Pending submission. See `HISTORY.md` for remaining to-do items.

---

## License

MIT
