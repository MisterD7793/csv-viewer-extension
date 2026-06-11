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
const copySelectedBtn = document.getElementById('copy-selected-btn');
const noResults = document.getElementById('no-results');

let allRows = [], headers = [], sortCol = -1, sortAsc = true;
let rawCsvText = '', csvFilename = 'roster.csv';
let selectedRows = new Set(), selectedCols = new Set();
let selectAllBtn = null, colCheckBtns = [];

// Feature modal
const modalOverlay = document.getElementById('modal-overlay');
const modalDontShow = document.getElementById('modal-dont-show');
function closeModal() {
  modalOverlay.style.display = 'none';
  if (modalDontShow.checked) localStorage.setItem('csv-viewer-v24-banner', '1');
}
document.getElementById('modal-close').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
if (!localStorage.getItem('csv-viewer-v24-banner')) modalOverlay.style.display = 'flex';

downloadBtn.addEventListener('click', () => {
  if (!rawCsvText) return;
  const blob = new Blob([rawCsvText], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = csvFilename; a.click();
  URL.revokeObjectURL(url);
});

copySelectedBtn.addEventListener('click', () => {
  const visibleRows = sortRows(filterRows(searchEl.value));
  const rowsToCopy = selectedRows.size > 0
    ? visibleRows.filter(r => selectedRows.has(r))
    : visibleRows;
  const colIndices = selectedCols.size > 0
    ? [...selectedCols].sort((a, b) => a - b)
    : headers.map((_, i) => i);
  const text = rowsToCopy.map(row => colIndices.map(i => row[i] ?? '').join('\t')).join('\n');
  copyAndFlash(text, copySelectedBtn);
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

const COPY_ICON  = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const CHECK_EMPTY = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
const CHECK_ON    = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="7,13 11,17 17,7"/></svg>`;
const CHECK_MIXED = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;

function copyAndFlash(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 900);
  });
}

function setCheckState(btn, checked, indeterminate = false) {
  btn.innerHTML = indeterminate ? CHECK_MIXED : (checked ? CHECK_ON : CHECK_EMPTY);
  btn.classList.toggle('is-checked', checked || indeterminate);
}

function updateSelectionUI() {
  if (selectAllBtn) {
    const visibleRows = sortRows(filterRows(searchEl.value));
    const n = visibleRows.filter(r => selectedRows.has(r)).length;
    setCheckState(selectAllBtn, n > 0 && n === visibleRows.length, n > 0 && n < visibleRows.length);
  }
  const hasRows = selectedRows.size > 0, hasCols = selectedCols.size > 0;
  copySelectedBtn.style.display = (hasRows || hasCols) ? 'flex' : 'none';
  if (hasRows || hasCols) {
    const parts = [];
    if (hasRows) parts.push(`${selectedRows.size} row${selectedRows.size !== 1 ? 's' : ''}`);
    if (hasCols) parts.push(`${selectedCols.size} col${selectedCols.size !== 1 ? 's' : ''}`);
    copySelectedBtn.querySelector('span').textContent = `Copy ${parts.join(' × ')}`;
  }
}

function renderHeaders() {
  colCheckBtns = [];
  const tr = document.createElement('tr');

  // Row-number column: select-all check button
  const rowNumTh = document.createElement('th');
  rowNumTh.className = 'row-num-th';
  selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'check-btn';
  selectAllBtn.title = 'Select / deselect all visible rows';
  setCheckState(selectAllBtn, false);
  selectAllBtn.addEventListener('click', () => {
    const visibleRows = sortRows(filterRows(searchEl.value));
    const allSelected = visibleRows.every(r => selectedRows.has(r));
    visibleRows.forEach(r => allSelected ? selectedRows.delete(r) : selectedRows.add(r));
    renderRows(sortRows(filterRows(searchEl.value)), searchEl.value);
  });
  rowNumTh.appendChild(selectAllBtn);
  tr.appendChild(rowNumTh);

  headers.forEach((h, i) => {
    const th = document.createElement('th');

    // Label + sort arrow
    const label = document.createElement('span');
    label.innerHTML = `${escHtml(h)}<span class="sort-arrow"></span>`;
    th.appendChild(label);

    // Copy-column button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-col-btn';
    copyBtn.title = 'Copy column';
    copyBtn.innerHTML = COPY_ICON;
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const visibleRows = sortRows(filterRows(searchEl.value));
      const text = visibleRows.map(r => r[i] ?? '').join('\n');
      copyAndFlash(text, copyBtn);
    });
    th.appendChild(copyBtn);

    // Column select check button (after copy icon)
    const colBtn = document.createElement('button');
    colBtn.className = 'check-btn';
    colBtn.title = 'Select column';
    setCheckState(colBtn, selectedCols.has(i));
    colCheckBtns[i] = colBtn;
    colBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedCols.has(i)) selectedCols.delete(i); else selectedCols.add(i);
      setCheckState(colBtn, selectedCols.has(i));
      th.classList.toggle('col-selected', selectedCols.has(i));
      updateSelectionUI();
    });
    th.appendChild(colBtn);

    th.addEventListener('click', () => {
      if (sortCol === i) sortAsc = !sortAsc;
      else { sortCol = i; sortAsc = true; }
      document.querySelectorAll('th').forEach(el => el.classList.remove('sorted-asc', 'sorted-desc'));
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
  rows.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    if (selectedRows.has(row)) tr.classList.add('row-selected');

    // Row-number cell: check button + number + copy button
    const rowNumTd = document.createElement('td');
    rowNumTd.className = 'row-num-cell';
    const inner = document.createElement('div');
    inner.className = 'row-num-inner';

    const rowBtn = document.createElement('button');
    rowBtn.className = 'check-btn';
    rowBtn.title = 'Select row';
    setCheckState(rowBtn, selectedRows.has(row));
    rowBtn.addEventListener('click', () => {
      if (selectedRows.has(row)) {
        selectedRows.delete(row);
        tr.classList.remove('row-selected');
        setCheckState(rowBtn, false);
      } else {
        selectedRows.add(row);
        tr.classList.add('row-selected');
        setCheckState(rowBtn, true);
      }
      updateSelectionUI();
    });

    const numSpan = document.createElement('span');
    numSpan.className = 'row-num-label';
    numSpan.textContent = rowIdx + 1;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-row-btn';
    copyBtn.title = 'Copy row';
    copyBtn.innerHTML = COPY_ICON;
    copyBtn.addEventListener('click', () => {
      const text = headers.map((_, i) => row[i] ?? '').join('\t');
      copyAndFlash(text, copyBtn);
    });

    inner.appendChild(rowBtn);
    inner.appendChild(numSpan);
    inner.appendChild(copyBtn);
    rowNumTd.appendChild(inner);
    tr.appendChild(rowNumTd);

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
  updateSelectionUI();
}

searchEl.addEventListener('input', (e) => {
  const q = e.target.value;
  renderRows(sortRows(filterRows(q)), q);
});
