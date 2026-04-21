// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "view-csv",
    title: "View CSV",
    contexts: ["link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "view-csv" || !info.linkUrl) return;
  if (info.linkUrl.startsWith('javascript:')) return;
  await openViewer(info.linkUrl);
});

chrome.downloads.onCreated.addListener(async (downloadItem) => {
  if (!isCsvDownload(downloadItem)) return;

  const allowed = await getAllowedDomains();
  if (allowed.length === 0) return;

  const tabDomain = await getInitiatingDomain(downloadItem);
  if (!tabDomain) return;

  const match = allowed.some(d => tabDomain === d || tabDomain.endsWith('.' + d));
  if (!match) return;

  const url = downloadItem.url || downloadItem.finalUrl || '';
  chrome.downloads.cancel(downloadItem.id, () => {
    chrome.downloads.erase({ id: downloadItem.id });
  });

  await openViewer(url);
});

async function getInitiatingDomain(downloadItem) {
  if (downloadItem.referrer) {
    try { return new URL(downloadItem.referrer).hostname; } catch {}
  }
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs[0]?.url) return new URL(tabs[0].url).hostname;
  } catch {}
  return null;
}

async function getAllowedDomains() {
  const result = await chrome.storage.sync.get('allowedDomains');
  return result.allowedDomains || [];
}

function detectEncoding(bytes) {
  // Check for BOM
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return 'utf-16le';
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return 'utf-16be';
  // Check for UTF-16 LE without BOM: every odd byte is 0x00
  const sample = Math.min(64, bytes.length);
  let nullOdds = 0;
  for (let i = 1; i < sample; i += 2) {
    if (bytes[i] === 0x00) nullOdds++;
  }
  if (nullOdds >= sample / 4) return 'utf-16le';
  return 'utf-8';
}

async function openViewer(csvUrl) {
  let csvText = null, fetchError = null;
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const encoding = detectEncoding(bytes);
    csvText = new TextDecoder(encoding).decode(buffer);
    csvText = csvText.replace(/^\uFEFF/, ''); // strip BOM char if present
  } catch (err) {
    fetchError = err.message;
  }

  const id = Date.now().toString();
  await chrome.storage.session.set({
    [id]: { csvText, fetchError, csvUrl, filename: filenameFromUrl(csvUrl) }
  });

  const viewerUrl = chrome.runtime.getURL("viewer.html") + "?id=" + id;
  chrome.tabs.create({ url: viewerUrl });
}

function isCsvDownload(item) {
  const url = (item.url || item.finalUrl || '').toLowerCase();
  const mime = (item.mime || '').toLowerCase();
  const filename = (item.filename || '').toLowerCase();
  return (
    url.includes('.csv') ||
    mime === 'text/csv' ||
    mime === 'application/csv' ||
    filename.endsWith('.csv')
  );
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const name = u.pathname.split("/").pop();
    return decodeURIComponent(name) || "roster.csv";
  } catch {
    return "roster.csv";
  }
}
