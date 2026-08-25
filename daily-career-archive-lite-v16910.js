/* AT AI Mobil — V16.9.10 Günlük Arşiv hafif listeleme yaması
   Bu dosyadaki işaretli bölümler build-runtime-v16910.cjs tarafından
   günlük arşiv IIFE'i içine yerleştirilir. */

/* V16910:BEGIN core */
function archiveKeyMetaA(primaryKey) {
  const key = cleanA(primaryKey);
  const parts = key.split('|');
  if (parts.length < 4 || (parts[0] !== 'race' && parts[0] !== 'model')) return null;
  return { key, kind:parts[0], date:parts[1], city:parts[2], raceNo:parts.slice(3).join('|') };
}

async function listDateKeysA(date, kind = '') {
  const db = await openArchiveDbA();
  if (!db) return [];
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(STORE, 'readonly');
      const index = tx.objectStore(STORE).index('date');
      const range = IDBKeyRange.only(String(date || ''));
      const req = typeof index.openKeyCursor === 'function'
        ? index.openKeyCursor(range)
        : index.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const row = archiveKeyMetaA(cursor.primaryKey ?? cursor.value?.key);
        if (row && (!kind || row.kind === kind)) out.push(row);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve(out);
    } catch { resolve(out); }
  });
}

function archiveCityLabelA(city) {
  const id = cleanA(city);
  try {
    if (cleanA(state?.city) === id) {
      const current = currentCityNameA();
      if (current) return current;
    }
  } catch {}
  try {
    const select = $a('citySelect');
    const option = [...(select?.options || [])].find(item => cleanA(item?.value) === id);
    const label = cleanA(option?.textContent);
    if (label) return label;
  } catch {}
  return id || 'Şehir';
}

function yieldArchivePaintA() {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else setTimeout(resolve, 0);
  });
}
/* V16910:END core */

/* V16910:BEGIN deleteDateA */
async function deleteDateA(date) {
  const city = cleanA(window.__AT_ARCHIVE_CITY_V152 || (typeof state !== 'undefined' ? state?.city : ''));
  const rows = (await listDateKeysA(date)).filter(row => cleanA(row.city) === city);
  await Promise.all(rows.map(row => idbDeleteA(row.key)));
  return rows.length;
}
/* V16910:END deleteDateA */

/* V16910:BEGIN updateArchiveToolbarA */
async function updateArchiveToolbarA() {
  ensureArchiveUiA();
  const holder = $a('careerArchiveToolbarV146');
  const careerOpen = $a('analysisDialog')?.dataset.view === 'career';
  if (holder) holder.style.display = careerOpen ? 'flex' : 'none';
  if (!careerOpen) return;
  const requestId = (updateArchiveToolbarA.requestId || 0) + 1;
  updateArchiveToolbarA.requestId = requestId;
  await new Promise(resolve => setTimeout(resolve, 35));
  if (requestId !== updateArchiveToolbarA.requestId) return;
  const date = cleanA(state?.date), city = cleanA(state?.city);
  const rows = (await listDateKeysA(date, 'race')).filter(row => cleanA(row.city) === city);
  if (requestId !== updateArchiveToolbarA.requestId) return;
  const count = $a('careerArchiveCountV146');
  if (count) count.textContent = rows.length ? `(${rows.length})` : '';
}
/* V16910:END updateArchiveToolbarA */

/* V16910:BEGIN openArchiveDialogA */
async function openArchiveDialogA() {
  ensureArchiveUiA();
  const dlg = $a('careerArchiveDialogV146');
  const list = $a('careerArchiveListV146');
  if (list) {
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = '<div class="career-archive-empty-v146"><b>Günlük Arşiv açılıyor…</b><br>Hafif kayıt özetleri hazırlanıyor.</div>';
  }
  if (dlg && !dlg.open) {
    try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  }
  await yieldArchivePaintA();
  await renderArchiveDialogA();
}
/* V16910:END openArchiveDialogA */

/* V16910:BEGIN renderArchiveDialogA */
async function renderArchiveDialogA() {
  const renderId = (renderArchiveDialogA.renderId || 0) + 1;
  renderArchiveDialogA.renderId = renderId;
  const date = cleanA(state?.date);
  const list = $a('careerArchiveListV146');
  const storage = $a('careerArchiveStorageV146');
  if (!list) return;
  list.setAttribute('aria-busy', 'true');
  if (storage) storage.textContent = 'Hafif liste etkin · ayrıntılar yalnız seçildiğinde yüklenir.';
  storageTextA().then(text => {
    if (storage && text && renderId === renderArchiveDialogA.renderId) {
      storage.textContent = `${text} Hafif liste etkin.`;
    }
  }).catch(() => {});

  const raceKeys = await listDateKeysA(date, 'race');
  if (renderId !== renderArchiveDialogA.renderId) return;
  const cityGroups = new Map();
  for (const row of raceKeys) {
    const id = cleanA(row.city);
    if (!id) continue;
    const item = cityGroups.get(id) || { name:archiveCityLabelA(id), count:0 };
    item.count++;
    cityGroups.set(id, item);
  }
  let city = cleanA(window.__AT_ARCHIVE_CITY_V152 || (typeof state !== 'undefined' ? state?.city : ''));
  if (!cityGroups.has(city)) city = cityGroups.keys().next().value || city;
  window.__AT_ARCHIVE_CITY_V152 = city;

  const tabs = $a('careerArchiveCityTabsV152');
  if (tabs) {
    tabs.innerHTML = [...cityGroups.entries()]
      .sort((a,b) => cleanA(a[1].name).localeCompare(cleanA(b[1].name), 'tr'))
      .map(([id,group]) => `<button type="button" class="${id === city ? 'primary' : 'secondary'} small" data-archive-city-v152="${escA(id)}">${escA(group.name)} (${group.count})</button>`)
      .join('');
    tabs.querySelectorAll('[data-archive-city-v152]').forEach(btn => btn.onclick = async () => {
      window.__AT_ARCHIVE_CITY_V152 = cleanA(btn.dataset.archiveCityV152);
      list.innerHTML = '<div class="career-archive-empty-v146">Şehir özeti açılıyor…</div>';
      await yieldArchivePaintA();
      await renderArchiveDialogA();
    });
  }

  const races = raceKeys
    .filter(row => cleanA(row.city) === city)
    .sort((a,b) => Number(a.raceNo) - Number(b.raceNo));
  if (!races.length) {
    list.innerHTML = `<div class="career-archive-empty-v146"><b>${escA(date || 'Seçili gün')}</b> için kayıtlı kariyer analizi yok.<br>Bir koşuyu hesapladığınızda otomatik kaydedilecek.</div>`;
    list.removeAttribute('aria-busy');
    return;
  }

  list.innerHTML = races.map(rec => `<div class="career-archive-row-v146" data-key="${escA(rec.key)}">
    <div class="career-archive-row-main-v146">
      <b>${escA(archiveCityLabelA(rec.city))} · ${escA(rec.raceNo)}. Koşu</b>
      <small>${escA(rec.date)} · Hızlı arşiv özeti</small>
      <small>Ayrıntı yalnız Aç veya PDF seçildiğinde yüklenir.</small>
    </div>
    <div class="career-archive-row-actions-v146">
      <button type="button" class="secondary small" data-open="${escA(rec.key)}">Aç</button>
      <button type="button" class="secondary small" data-pdf="${escA(rec.key)}">PDF</button>
      <button type="button" class="danger-ghost" data-del="${escA(rec.key)}">Sil</button>
    </div>
  </div>`).join('');
  list.removeAttribute('aria-busy');

  list.querySelectorAll('[data-open]').forEach(btn => btn.onclick = async () => {
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Açılıyor…';
    await yieldArchivePaintA();
    try {
      const rec = await idbGetA(btn.dataset.open);
      if (!rec) return;
      if (!recordMatchesProgramA(rec)) {
        alert(`Bu kaydı açmak için önce ${rec.date} / ${rec.cityName || rec.city} programını yükleyin. Program koşu listesi de arşivdeki kayıtla aynı olmalıdır.`);
        return;
      }
      const select = $a('analysisRace');
      if (select && [...select.options].some(option => String(option.value) === String(rec.raceNo))) {
        select.value = String(rec.raceNo);
      }
      const result = restoreRecordIntoStateA(rec);
      if (result && typeof renderCareerAnalysis === 'function') renderCareerAnalysis(result, String(rec.raceNo));
      $a('careerArchiveDialogV146')?.close();
      showArchiveToastA(`${rec.raceNo}. Koşu arşivden açıldı.`);
    } finally {
      if (btn.isConnected) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    }
  });
  list.querySelectorAll('[data-pdf]').forEach(btn => btn.onclick = () => exportRecordPdfA(btn.dataset.pdf));
  list.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
    const rec = archiveKeyMetaA(btn.dataset.del);
    if (!rec || !confirm(`${archiveCityLabelA(rec.city)} ${rec.raceNo}. Koşu arşiv kaydı silinsin mi?`)) return;
    await Promise.all([
      idbDeleteA(rec.key),
      idbDeleteA(modelKeyA(rec.date, rec.city, rec.raceNo))
    ]);
    await renderArchiveDialogA();
    await updateArchiveToolbarA();
  });
}
/* V16910:END renderArchiveDialogA */
