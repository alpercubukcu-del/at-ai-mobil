/* AT AI Mobil — CAREER-PREPARATION-FALLBACK-V16.5.3
 * Kariyer/Hazırlık puanı tarihsel roadmap üretilemediğinde boş kalmasın.
 * Yalnız hedef tarihten önceki at kariyeri kullanılır; sonuç/AGF kullanılmaz.
 */
(() => {
  'use strict';
  const VERSION = 'CAREER-PREPARATION-FALLBACK-V16.5.3';
  if (typeof runCareerAnalysis !== 'function') return;

  const originalRunCareerAnalysis = runCareerAnalysis;
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, Number.isFinite(Number(v)) ? Number(v) : a));
  const iso = v => {
    const s = String(v ?? '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return s;
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    return m ? `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : '';
  };
  const dateOf = r => iso(r?.isoDate ?? r?.date ?? r?.Tarih_ISO ?? r?.Tarih);
  const finishOf = r => {
    const n = Number(r?.finish ?? r?.rank ?? r?.sira ?? r?.Bitiriş ?? r?.bitiris);
    return Number.isFinite(n) ? n : null;
  };
  const finishScore = f => {
    if (f === 1) return 100;
    if (f === 2) return 88;
    if (f === 3) return 78;
    if (f === 4) return 67;
    if (f === 5) return 58;
    if (f === 6) return 50;
    if (f === 7) return 43;
    if (f === 8) return 36;
    if (f === 9) return 30;
    if (f >= 10) return 22;
    return 35;
  };
  const dayDiff = (a, b) => {
    const A = Date.parse(`${iso(a)}T00:00:00Z`);
    const B = Date.parse(`${iso(b)}T00:00:00Z`);
    return Number.isFinite(A) && Number.isFinite(B) ? Math.round((B - A) / 86400000) : null;
  };
  const readiness = gap => {
    if (gap === null) return 65;
    if (gap < 5) return 75;
    if (gap <= 14) return 95;
    if (gap <= 35) return 100;
    if (gap <= 55) return 92;
    if (gap <= 80) return 82;
    if (gap <= 120) return 68;
    if (gap <= 180) return 55;
    return 42;
  };
  const sampleReliability = n => n <= 0 ? 0 : n === 1 ? 0.85 : n === 2 ? 0.92 : 1;
  const validScore = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

  function fullCareerRows(career, targetDate) {
    const source = Array.isArray(career?.history) ? career.history
      : Array.isArray(career?.fullHistory) ? career.fullHistory
      : Array.isArray(career?.recentForm) ? career.recentForm
      : Array.isArray(career?.roadmap) ? career.roadmap
      : [];
    const cut = iso(targetDate);
    const map = new Map();
    for (const r of source) {
      const d = dateOf(r);
      if (!d || (cut && d >= cut)) continue;
      const f = finishOf(r);
      if (f === null) continue;
      const key = String(r?.uniqueKey || [d, r?.city || r?.sehir || '', r?.distance || r?.mesafe || '', f].join('|'));
      map.set(key, r);
    }
    return [...map.values()].sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  }

  function currentCareerPreparation(career, targetDate) {
    const rows = fullCareerRows(career, targetDate);
    const n = rows.length;
    if (!n) return null;

    const recent = rows.slice(-3).reverse();
    const weights = [1, 0.70, 0.45];
    let num = 0, den = 0;
    recent.forEach((r, i) => {
      num += finishScore(finishOf(r)) * weights[i];
      den += weights[i];
    });
    const recentForm = den ? num / den : 50;

    const wins = rows.filter(r => finishOf(r) === 1).length;
    const top3 = rows.filter(r => (finishOf(r) || 99) <= 3).length;
    const top5 = rows.filter(r => (finishOf(r) || 99) <= 5).length;
    const winRate = wins / n;
    const top3Rate = top3 / n;
    const top5Rate = top5 / n;
    const careerQuality = clamp(35 + 65 * (0.55 * winRate + 0.30 * top3Rate + 0.15 * top5Rate));

    const lastDate = dateOf(rows[rows.length - 1]);
    const gap = lastDate && targetDate ? dayDiff(lastDate, targetDate) : null;
    const ready = readiness(gap);

    const raw = recentForm * 0.55 + careerQuality * 0.30 + ready * 0.15;
    const rel = sampleReliability(n);
    const score = clamp(50 + (raw - 50) * rel, 0, 98);

    return {
      score: Math.round(score),
      recentForm: +recentForm.toFixed(1),
      careerQuality: +careerQuality.toFixed(1),
      readiness: +ready.toFixed(1),
      careerCount: n,
      sampleReliability: +rel.toFixed(2),
      lastCareerDate: lastDate || null,
      gapDays: gap
    };
  }

  runCareerAnalysis = async function patchedRunCareerAnalysis(selectedRaces, raceValue) {
    await originalRunCareerAnalysis(selectedRaces, raceValue);

    const result = state?.analyses?.career;
    if (!result || !Array.isArray(result.races)) return;

    let filled = 0;
    for (const race of result.races) {
      for (const item of (Array.isArray(race?.horses) ? race.horses : [])) {
        const sim = item?.galibiyetBenzerligi || {};
        if (validScore(sim.score)) continue;
        const fallback = currentCareerPreparation(item?.career || {}, result.date || state.date);
        if (!fallback) continue; // gerçek debut: puan yine boş kalır
        item.galibiyetBenzerligi = {
          ...sim,
          score: fallback.score,
          fallback: true,
          method: 'CURRENT_CAREER_PREPARATION_FALLBACK_V1',
          referenceCount: Number(sim.referenceCount) || 0,
          fallbackMetrics: fallback
        };
        filled += 1;
      }
    }

    result.preparationFallbackVersion = VERSION;
    result.preparationFallbackFilled = filled;
    if (filled > 0) {
      result.similarityNote = 'Tarihsel referans varsa kariyer yolu benzerliği; referans üretilemezse yalnız yarış tarihinden önceki tam kariyer formu, kariyer kalitesi ve hazırlık aralığından sonuçsuz K/H puanı kullanılır.';
      save();
      renderCareerAnalysis(result, raceValue);
    }
  };

  window.__AT_AI_CAREER_PREPARATION_FALLBACK__ = {
    version: VERSION,
    score: currentCareerPreparation
  };
})();
