// options.js

const newDomainInput = document.getElementById('new-domain');
const addBtn = document.getElementById('add-btn');
const domainList = document.getElementById('domain-list');
const emptyState = document.getElementById('empty-state');
const toast = document.getElementById('toast');

let domains = [];

async function load() {
  const result = await chrome.storage.sync.get('allowedDomains');
  domains = result.allowedDomains || [];
  render();
}

function render() {
  domainList.innerHTML = '';
  emptyState.style.display = domains.length === 0 ? 'block' : 'none';
  domains.forEach((d, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${d}</span><button title="Remove" data-i="${i}">×</button>`;
    li.querySelector('button').addEventListener('click', () => remove(i));
    domainList.appendChild(li);
  });
}

async function save() {
  await chrome.storage.sync.set({ allowedDomains: domains });
  showToast();
}

function showToast() {
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function add() {
  let val = newDomainInput.value.trim().toLowerCase();
  // Strip protocol/path if someone pastes a full URL
  try { val = new URL(val.includes('://') ? val : 'https://' + val).hostname; } catch {}
  if (!val || domains.includes(val)) { newDomainInput.value = ''; return; }
  domains.push(val);
  newDomainInput.value = '';
  render();
  save();
}

function remove(i) {
  domains.splice(i, 1);
  render();
  save();
}

addBtn.addEventListener('click', add);
newDomainInput.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });

document.getElementById('export-btn').addEventListener('click', () => {
  const json = JSON.stringify({ allowedDomains: domains }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'csv-viewer-domains.json'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-btn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.allowedDomains)) return;
        let added = 0;
        data.allowedDomains.forEach(d => {
          if (typeof d === 'string' && d && !domains.includes(d)) { domains.push(d); added++; }
        });
        if (added > 0) { render(); save(); }
      } catch {}
    };
    reader.readAsText(file);
  });
  input.click();
});

load();
