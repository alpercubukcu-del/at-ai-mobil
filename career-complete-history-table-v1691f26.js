/* AT AI Mobil - V16.9.1F26 COMPLETE CAREER TABLE
   Main detail table must expose every career row supplied by the current-horse
   response, not just the first available derived path.
*/
(() => {
'use strict';
if (window.__AT_CAREER_COMPLETE_HISTORY_TABLE_V1691F26__) return;
window.__AT_CAREER_COMPLETE_HISTORY_TABLE_V1691F26__ = true;
const VERSION = 'CAREER-COMPLETE-HISTORY-TABLE-V16.9.1F26';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const finite = v => { const n = Number(String(v ?? '').replace(',', '.').match(/-?\d+(?:[.,]\d+)?/)?.[0] ?? ''); return Number.isFinite(n) ? n : null; };
const rowDate = row => clean(row?.isoDate || row?.date);
const rowKey = row => [rowDate(row), clean(row?.city || row?.sehir), clean(row?.class || row?.raceClass || row?.classRaw), clean(row?.ageGroup || row?.group || row?.groupRaw), clean(row?.track || row?.pist), finite(row?.distance ?? row?.mesafe ?? row?.msf), finite(row?.finish ?? row?.rank ?? row?.sira)].join('|');

function allCareerRows(career = {}) {
  const merged = new Map();
  for (const rows of [career.history, career.fullPathBefore, career.historyBefore, career.fullPath, career.comparisonPathBefore, career.roadmapBefore, career.races, career.roadmap, career.top5, career.preparationPath]) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== 'object' || !rowDate(row)) continue;
      const key = rowKey(row);
      const existing = merged.get(key);
      merged.set(key, existing ? { ...row, ...existing } : row);
    }
  }
  return [...merged.values()].sort((a, b) => rowDate(a).localeCompare(rowDate(b)));
}

roadmapTableHtml = function(career = {}) {
  const rows = allCareerRows(career);
  if (!rows.length) return '<div style="padding:10px;opacity:.7">TJK kariyer satırı bulunamadı.</div>';
  const cell = v => `<td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08)">${esc(v ?? '-')}</td>`;
  return `<div style="font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.75;margin:10px 0 6px">TAM KARİYER — TJK’DEN ALINAN TÜM KOŞULAR</div><div style="font-size:10px;opacity:.68;margin:-2px 0 7px">${rows.length} tekil yarış. Eşleşme puanında kullanılan satırlar bu listenin içindedir.</div><div style="overflow-x:auto;width:100%"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:980px"><thead><tr>${['Tarih','İl','Sıra','Sınıf','Yaş/Grup','Sıklet','HP','Pist','Mesafe'].map(x=>`<th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18)">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row => { const finish = finite(row?.finish ?? row?.rank ?? row?.sira); return `<tr style="${finish === 1 ? 'background:rgba(34,197,94,.12)' : ''}">${cell(`${finish === 1 ? '🏆 ' : ''}${row?.date || row?.isoDate || '-'}`)}${cell(row?.city || row?.sehir || '-')}${cell(finish ?? '-')}${cell(row?.class || row?.raceClass || row?.classRaw || '-')}${cell(row?.ageGroup || row?.group || row?.groupRaw || '-')}${cell(finite(row?.weight ?? row?.siklet ?? row?.kilo) ?? '-')}${cell(finite(row?.hp) ?? '-')}${cell(row?.track || row?.pist || '-')}${cell(finite(row?.distance ?? row?.mesafe ?? row?.msf) ?? '-')}</tr>`; }).join('')}</tbody></table></div>`;
};

window.ATCareerCompleteHistoryTableV1691F26 = { version:VERSION, rows:allCareerRows };
console.info('[AT AI]', VERSION, 'aktif - ana tablo tüm kariyer kaynaklarını birleştirir.');
})();
