const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f41.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F42] Missing build-runtime-v1691f41.cjs');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F42] Previous build output missing.');

let app = fs.readFileSync(APP, 'utf8');

const openDbReplacement = `const IDB_TIMEOUT_MS_A = 1800;

function openArchiveDbA() {
  if (dbPromiseA) return dbPromiseA;
  dbPromiseA = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req = null, settled = false, timer = null;
    const done = value => {
      if (settled) {
        if (value && typeof value.close === 'function') { try { value.close(); } catch {} }
        return;
      }
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value || null);
    };
    timer = setTimeout(() => {
      console.warn('[AT AI] V16.9.1F42 Kariyer arsiv DB acilisi zaman asimi; canli hesaba devam ediliyor.');
      done(null);
    }, IDB_TIMEOUT_MS_A);
    try { req = indexedDB.open(DB_NAME, 1); } catch { return done(null); }
    req.onupgradeneeded = () => {
      try {
        const db = req.result;
        const store = db.objectStoreNames.contains(STORE)
          ? req.transaction.objectStore(STORE)
          : db.createObjectStore(STORE, { keyPath:'key' });
        if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
        if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
      } catch {}
    };
    req.onblocked = () => {
      console.warn('[AT AI] V16.9.1F42 Kariyer arsiv DB blocked; arsiv bypass edildi.');
      done(null);
    };
    req.onsuccess = () => done(req.result);
    req.onerror = () => done(null);
  });
  return dbPromiseA;
}

async function idbGetA`;

const openDbRx = /function openArchiveDbA\(\) \{[\s\S]*?\n\}\n\nasync function idbGetA/;
if (!openDbRx.test(app)) throw new Error('[V16.9.1F42] openArchiveDbA block not found.');
app = app.replace(openDbRx, openDbReplacement);

const getReplacement = `async function idbGetA(key) {
  const db = await openArchiveDbA();
  if (!db) return null;
  return new Promise(resolve => {
    let settled = false;
    const done = value => { if (settled) return; settled = true; clearTimeout(timer); resolve(value || null); };
    const timer = setTimeout(() => done(null), IDB_TIMEOUT_MS_A);
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => done(req.result || null);
      req.onerror = () => done(null);
    } catch { done(null); }
  });
}

async function idbPutA`;
const getRx = /async function idbGetA\(key\) \{[\s\S]*?\n\}\n\nasync function idbPutA/;
if (!getRx.test(app)) throw new Error('[V16.9.1F42] idbGetA block not found.');
app = app.replace(getRx, getReplacement);

const putReplacement = `async function idbPutA(value) {
  const db = await openArchiveDbA();
  if (!db) return false;
  return new Promise(resolve => {
    let settled = false;
    const done = value => { if (settled) return; settled = true; clearTimeout(timer); resolve(Boolean(value)); };
    const timer = setTimeout(() => done(false), IDB_TIMEOUT_MS_A);
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value);
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false);
    } catch { done(false); }
  });
}

async function idbDeleteA`;
const putRx = /async function idbPutA\(value\) \{[\s\S]*?\n\}\n\nasync function idbDeleteA/;
if (!putRx.test(app)) throw new Error('[V16.9.1F42] idbPutA block not found.');
app = app.replace(putRx, putReplacement);

const deleteReplacement = `async function idbDeleteA(key) {
  const db = await openArchiveDbA();
  if (!db) return false;
  return new Promise(resolve => {
    let settled = false;
    const done = value => { if (settled) return; settled = true; clearTimeout(timer); resolve(Boolean(value)); };
    const timer = setTimeout(() => done(false), IDB_TIMEOUT_MS_A);
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false);
    } catch { done(false); }
  });
}

async function listDateA`;
const deleteRx = /async function idbDeleteA\(key\) \{[\s\S]*?\n\}\n\nasync function listDateA/;
if (!deleteRx.test(app)) throw new Error('[V16.9.1F42] idbDeleteA block not found.');
app = app.replace(deleteRx, deleteReplacement);

const listReplacement = `async function listDateA(date) {
  const db = await openArchiveDbA();
  if (!db) return [];
  return new Promise(resolve => {
    const out = [];
    let settled = false;
    const done = () => { if (settled) return; settled = true; clearTimeout(timer); resolve(out); };
    const timer = setTimeout(done, IDB_TIMEOUT_MS_A);
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const index = store.index('date');
      const req = index.openCursor(IDBKeyRange.only(String(date || '')));
      req.onsuccess = () => {
        if (settled) return;
        const c = req.result;
        if (!c) return;
        out.push(c.value);
        c.continue();
      };
      tx.oncomplete = done;
      tx.onerror = tx.onabort = done;
    } catch { done(); }
  });
}

async function deleteDateA`;
const listRx = /async function listDateA\(date\) \{[\s\S]*?\n\}\n\nasync function deleteDateA/;
if (!listRx.test(app)) throw new Error('[V16.9.1F42] listDateA block not found.');
app = app.replace(listRx, listReplacement);

const oldCatch = `  } catch (e) {
    if (body) body.innerHTML=\`<div class="career-model-empty-v112">⚠ \${esc(e?.message||'5 Model verisi hazirlanamadi.')}</div>\`;
  }
}`;
const newCatch = `  } catch (e) {
    box.dataset.loaded='0';
    if (body) {
      body.innerHTML=\`<div class="career-model-empty-v112">⚠ \${esc(e?.message||'5 Model verisi hazirlanamadi.')}<br><button type="button" data-v1691f42-model-retry class="secondary small" style="margin-top:10px">Tekrar dene</button></div>\`;
      const retry=body.querySelector('[data-v1691f42-model-retry]');
      if (retry) retry.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();box.dataset.loaded='0';loadFiveModelV139(box,race);});
    }
  }
}`;
if (!app.includes(oldCatch)) throw new Error('[V16.9.1F42] loadFiveModelV139 catch block not found.');
app = app.replace(oldCatch, newCatch);

app += `\n/* CAREER-ARCHIVE-IDB-TIMEOUT-AND-RETRY-V16.9.1F42 */\nwindow.__AT_CAREER_ARCHIVE_IDB_TIMEOUT_V1691F42__=true;\n`;

for (const token of [
  'CAREER-ARCHIVE-IDB-TIMEOUT-AND-RETRY-V16.9.1F42',
  'CAREER-FIVE-MODEL-FRESH-START-RECOVERY-V16.9.1F41',
  'CAREER-FIVE-MODEL-STALE-RECOVERY-V16.9.1F40',
  'V16.9.1F42 Kariyer arsiv DB blocked',
  'data-v1691f42-model-retry'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F42] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169143');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169143')) throw new Error('[V16.9.1F42] Cache bust update failed.');

console.log('[AT AI] V16.9.1F42 build complete: IndexedDB archive reads/writes are bounded and failed 5 Model loads are retryable.');
