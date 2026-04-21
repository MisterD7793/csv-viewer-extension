// viewer.js

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\r' && next === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
      else if (ch === '\n' || ch === '\r') { row.push(field); rows.push(row); row = []; field = ''; }
      else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const params = new URLSearchParams(location.search);
const id = params.get('id');

const statusEl = document.getElementById('status');
const tableWrap = document.getElementById('table-wrap');
const theadEl = document.getElementById('thead');
const tbodyEl = document.getElementById('tbody');
const searchEl = document.getElementById('search');
const rowCountEl = document.getElementById('row-count');
const filenameEl = document.getElementById('filename');
const downloadBtn = document.getElementById('download-btn');
const noResults = document.getElementById('no-results');

let allRows = [], headers = [], sortCol = -1, sortAsc = true;
let rawCsvText = '', csvFilename = 'roster.csv';

downloadBtn.addEventListener('click', () => {
  if (!rawCsvText) return;
  const blob = new Blob([rawCsvText], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = csvFilename; a.click();
  URL.revokeObjectURL(url);
});

function initWithData(csvText, fetchError, csvUrl, filename) {
  csvFilename = filename || 'roster.csv';
  filenameEl.textContent = csvFilename;
  document.title = csvFilename;

  if (fetchError || !csvText) {
    statusEl.innerHTML = `<span style="color:#f87171">⚠ Could not load CSV: ${fetchError || 'Empty response'}</span>`;
    return;
  }

  rawCsvText = csvText;
  const parsed = parseCSV(csvText);
  if (!parsed.length) { statusEl.innerHTML = '<span style="color:#f87171">⚠ Empty or invalid CSV.</span>'; return; }

  headers = parsed[0];
  allRows = parsed.slice(1).filter(r => r.some(c => c.trim() !== ''));
  renderHeaders();
  renderRows(allRows);
  statusEl.style.display = 'none';
  tableWrap.style.display = '';
}

if (!id) {
  statusEl.textContent = 'No data provided.';
} else {
  chrome.storage.session.get(id, (result) => {
    const data = result[id];
    if (!data) { statusEl.textContent = 'Session data not found. Please try again.'; return; }
    chrome.storage.session.remove(id);
    initWithData(data.csvText, data.fetchError, data.csvUrl, data.filename);
  });
}

function renderHeaders() {
  const tr = document.createElement('tr');
  headers.forEach((h, i) => {
    const th = document.createElement('th');
    th.innerHTML = `${escHtml(h)}<span class="sort-arrow"></span>`;
    th.addEventListener('click', () => {
      if (sortCol === i) sortAsc = !sortAsc;
      else { sortCol = i; sortAsc = true; }
      document.querySelectorAll('th').forEach(el => el.classList.remove('sorted-asc','sorted-desc'));
      th.classList.add(sortAsc ? 'sorted-asc' : 'sorted-desc');
      renderRows(sortRows(filterRows(searchEl.value)), searchEl.value);
    });
    tr.appendChild(th);
  });
  theadEl.appendChild(tr);
}

function filterRows(query) {
  if (!query.trim()) return allRows;
  const q = query.toLowerCase();
  return allRows.filter(row => row.some(cell => cell.toLowerCase().includes(q)));
}

function sortRows(rows) {
  if (sortCol < 0) return rows;
  return [...rows].sort((a, b) => {
    const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    const bothNum = !isNaN(parseFloat(av)) && !isNaN(parseFloat(bv));
    const cmp = bothNum ? parseFloat(av) - parseFloat(bv) : av.localeCompare(bv);
    return sortAsc ? cmp : -cmp;
  });
}

function highlight(text, query) {
  if (!query.trim()) return escHtml(text);
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escHtml(text).replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderRows(rows, query = '') {
  tbodyEl.innerHTML = '';
  rowCountEl.textContent = `${rows.length} row${rows.length !== 1 ? 's' : ''}`;
  noResults.style.display = rows.length === 0 ? 'block' : 'none';
  const frag = document.createDocumentFragment();
  rows.forEach(row => {
    const tr = document.createElement('tr');
    headers.forEach((_, i) => {
      const td = document.createElement('td');
      const val = row[i] ?? '';
      if (!val) td.classList.add('empty');
      td.innerHTML = val ? highlight(val, query) : '—';
      tr.appendChild(td);
    });
    frag.appendChild(tr);
  });
  tbodyEl.appendChild(frag);
}

searchEl.addEventListener('input', (e) => {
  const q = e.target.value;
  renderRows(sortRows(filterRows(q)), q);
});

