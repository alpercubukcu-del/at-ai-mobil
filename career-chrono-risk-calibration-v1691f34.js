/* AT AI Mobil - V16.9.1F34 CAREER CHRONO RISK CALIBRATION
   - Adds a modest chronometric form layer to Career scores by using existing degree/distance/track rows.
   - Drops non-runners from scored ranking when the program/career row marks them as kosmaz/cikarildi.
   - Marks flat score bands and risky race classes so narrow singles are not treated as high confidence.
*/
(() => {
'use strict';
if (window.__AT_CAREER_CHRONO_RISK_CALIBRATION_V1691F34__) return;
window.__AT_CAREER_CHRONO_RISK_CALIBRATION_V1691F34__ = true;

const VERSION = 'CAREER-CHRONO-RISK-CALIBRATION-V16.9.1F34';

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = clean(value).replace(/%/g, '').replace(',', '.');
  if (!text) return null;
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value = '') {
  return clean(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function esc(value) {
  try {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
  } catch {}
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function currentState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function parseDistance(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = clean(value).replace(/\./g, '');
  const match = text.match(/\b(\d{3,4})\b/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function trackKind(value) {
  const text = normalizeText(value);
  if (!text) return '';
  if (text.includes('sentetik')) return 'sentetik';
  if (text.includes('kum')) return 'kum';
  if (text.includes('cim')) return 'cim';
  return text;
}

function parseDegreeSeconds(value) {
  const text = clean(value).replace(',', '.');
  if (!text || /kosmaz|koşmaz|derecesiz|dnf|^-$|^—$/i.test(text)) return null;

  const triple = text.match(/(\d{1,2})[.:](\d{2})[.:](\d{2})/);
  if (triple) {
    const minutes = Number(triple[1]);
    const seconds = Number(triple[2]);
    const centi = Number(triple[3]);
    if ([minutes, seconds, centi].every(Number.isFinite) && seconds < 60) {
      return minutes * 60 + seconds + centi / 100;
    }
  }

  const pair = text.match(/\b(\d{1,2})[.:](\d{2})\b/);
  if (pair) {
    const seconds = Number(pair[1]);
    const centi = Number(pair[2]);
    if (Number.isFinite(seconds) && Number.isFinite(centi)) {
      return seconds + centi / 100;
    }
  }

  return null;
}

function horseNo(item) {
  const horse = item?.horse && typeof item.horse === 'object' ? item.horse : item;
  const parsed = Number(horse?.no ?? horse?.programNo ?? horse?.sira ?? 999);
  return Number.isFinite(parsed) ? parsed : 999;
}

function horseName(item) {
  const horse = item?.horse && typeof item.horse === 'object' ? item.horse : item;
  return clean(horse?.name || horse?.atAdi || horse?.horseName || '');
}

function scoreOf(item, useOriginal = false) {
  const sim = item?.galibiyetBenzerligi || {};
  if (useOriginal && sim.originalCareerScoreF34 !== undefined) return finite(sim.originalCareerScoreF34);
  return finite(sim.score);
}

function careerRows(item) {
  const career = item?.career || {};
  const out = [];
  const buckets = [
    career.fullPathBefore,
    career.historyBefore,
    career.comparisonPathBefore,
    career.roadmapBefore,
    career.roadmap,
    career.top5,
    career.races,
    career.history
  ];

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    for (const row of bucket) {
      if (row && typeof row === 'object') out.push(row);
    }
    if (out.length) break;
  }
  return out;
}

function rowText(row) {
  if (!row || typeof row !== 'object') return clean(row);
  return [
    row.status,
    row.durum,
    row.note,
    row.not,
    row.comment,
    row.aciklama,
    row.result,
    row.degree,
    row.derece
  ].map(clean).join(' ');
}

function isNonRunner(value) {
  if (!value) return false;
  const row = value?.horse && typeof value.horse === 'object' ? value.horse : value;
  if (row.scratched || row.isScratched || row.kosmaz || row.isNonRunner) return true;
  const text = normalizeText([
    rowText(row),
    rowText(value),
    row.statusText,
    row.runningStatus
  ].map(clean).join(' '));
  return /\b(kosmaz|cikarildi|cikmis|non runner|scratch|scratched)\b/.test(text);
}

function raceText(race) {
  return normalizeText([
    race?.class,
    race?.ageGroup,
    race?.meta?.class,
    race?.meta?.ageGroup
  ].map(clean).join(' '));
}

function raceRiskTags(race, scoredBefore) {
  const text = raceText(race);
  const tags = [];
  if (text.includes('handikap')) tags.push('HANDIKAP');
  if (text.includes('satis')) tags.push('SATIS');
  if (text.includes('maiden')) tags.push('MAIDEN');

  const ordered = scoredBefore.slice().sort((a, b) => b - a);
  if (ordered.length >= 2) {
    const top = ordered[0];
    const second = ordered[1];
    const gap = Math.round((top - second) * 100) / 100;
    const band = ordered.filter(score => top - score <= 2).length;
    if (gap <= 2) tags.push('DAR_PUAN_FARKI');
    if (band >= 3) tags.push('KALABALIK_UST_BANT');
  }

  return Array.from(new Set(tags));
}

function chronometricProfiles(race) {
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  const targetDistance = parseDistance(race?.distance || race?.meta?.distance);
  const targetTrack = trackKind(race?.track || race?.meta?.track);
  if (!targetDistance) return new Map();

  const profiles = [];
  for (const item of horses) {
    if (isNonRunner(item)) continue;
    const samples = [];
    const rows = careerRows(item);

    rows.forEach((row, index) => {
      const secs = parseDegreeSeconds(row?.degree || row?.derece || row?.time || row?.sure);
      if (!secs) return;

      const rowDistance = parseDistance(row?.distance || row?.mesafe || row?.msf);
      if (!rowDistance) return;

      const rowTrack = trackKind(row?.track || row?.pist);
      if (targetTrack && rowTrack && targetTrack !== rowTrack) return;

      const distanceGap = Math.abs(rowDistance - targetDistance);
      if (distanceGap > 300) return;

      const adjustedSeconds = secs * (targetDistance / rowDistance);
      samples.push({
        adjustedSeconds,
        rawSeconds:secs,
        distance:rowDistance,
        track:rowTrack,
        recencyIndex:index,
        finish:finite(row?.finish ?? row?.rank ?? row?.sira)
      });
    });

    if (!samples.length) continue;

    samples.sort((a, b) => a.recencyIndex - b.recencyIndex);
    const recent = samples.slice(0, 3);
    const weightTotal = recent.reduce((sum, sample, index) => sum + (3 - index), 0);
    const recentWeighted = recent.reduce((sum, sample, index) => sum + sample.adjustedSeconds * (3 - index), 0) / Math.max(1, weightTotal);
    const best = Math.min(...samples.map(sample => sample.adjustedSeconds));
    const effectiveSeconds = Math.min(best, recentWeighted);

    profiles.push({
      item,
      horseNo:horseNo(item),
      horseName:horseName(item),
      effectiveSeconds,
      bestSeconds:best,
      recentSeconds:recentWeighted,
      sampleCount:samples.length
    });
  }

  profiles.sort((a, b) => {
    if (a.effectiveSeconds !== b.effectiveSeconds) return a.effectiveSeconds - b.effectiveSeconds;
    return a.horseNo - b.horseNo;
  });

  const bestSeconds = profiles[0]?.effectiveSeconds;
  const byItem = new Map();
  profiles.forEach((profile, index) => {
    const secondsPer1000 = bestSeconds ? (profile.effectiveSeconds - bestSeconds) / Math.max(1, targetDistance / 1000) : 0;
    const chronoScore = clamp(Math.round(96 - secondsPer1000 * 7 - index * 0.8), 62, 96);
    byItem.set(profile.item, {
      ...profile,
      rank:index + 1,
      chronoScore,
      secondsPer1000:Math.round(secondsPer1000 * 100) / 100
    });
  });

  return byItem;
}

function topBandStats(items) {
  const scores = items
    .map(item => scoreOf(item))
    .filter(score => score !== null)
    .sort((a, b) => b - a);
  if (!scores.length) return { scoredCount:0, top:null, gap:null, band:0 };
  const top = scores[0];
  const second = scores[1] ?? null;
  return {
    scoredCount:scores.length,
    top,
    gap:second === null ? null : Math.round((top - second) * 100) / 100,
    band:scores.filter(score => top - score <= 2).length
  };
}

function confidenceFrom(race, stats, tags, chronoCount, nonRunnerCount) {
  const riskyClass = tags.includes('HANDIKAP') || tags.includes('SATIS');
  let confidence = 'YUKSEK';
  let coverage = 1;

  if (
    stats.band >= 4 ||
    (stats.gap !== null && stats.gap <= 2 && riskyClass) ||
    (stats.gap !== null && stats.gap <= 1) ||
    (riskyClass && chronoCount < 2)
  ) {
    confidence = 'DUSUK';
    coverage = clamp(Math.max(3, stats.band || 3), 3, 5);
  } else if (
    stats.band >= 3 ||
    (stats.gap !== null && stats.gap <= 4) ||
    riskyClass ||
    tags.includes('MAIDEN')
  ) {
    confidence = 'ORTA';
    coverage = clamp(Math.max(2, Math.min(4, stats.band || 2)), 2, 4);
  }

  if (nonRunnerCount > 0) coverage = Math.max(coverage, Math.min(5, nonRunnerCount + 2));

  return {
    singleConfidence:confidence,
    recommendedCoverage:coverage,
    reason:[
      riskyClass ? 'riskli kosu tipi' : '',
      stats.gap !== null && stats.gap <= 2 ? 'dar puan farki' : '',
      stats.band >= 3 ? 'kalabalik ust bant' : '',
      chronoCount >= 2 ? 'kronometrik destek' : '',
      nonRunnerCount > 0 ? 'kosmaz filtresi' : ''
    ].filter(Boolean).join(' · ') || 'puan farki yeterli'
  };
}

function calibrateRace(race) {
  if (!race || !Array.isArray(race.horses)) return false;

  let changed = false;
  let nonRunnerCount = 0;

  for (const item of race.horses) {
    const sim = item?.galibiyetBenzerligi;
    if (!sim || typeof sim !== 'object') continue;

    const current = finite(sim.score);
    if (sim.originalCareerScoreF34 === undefined) {
      sim.originalCareerScoreF34 = current;
      changed = true;
    }

    if (isNonRunner(item)) {
      nonRunnerCount += 1;
      if (sim.score !== null || !sim.nonRunnerByF34) {
        sim.score = null;
        sim.nonRunnerByF34 = true;
        sim.scoreSource = [sim.scoreSource, 'NON_RUNNER_GUARD_F34'].filter(Boolean).join('+');
        changed = true;
      }
    }
  }

  const beforeScores = race.horses
    .filter(item => !isNonRunner(item))
    .map(item => scoreOf(item, true))
    .filter(score => score !== null);
  const tags = raceRiskTags(race, beforeScores);
  const flatRisk = tags.includes('DAR_PUAN_FARKI') || tags.includes('KALABALIK_UST_BANT');
  const classRisk = tags.includes('HANDIKAP') || tags.includes('SATIS');
  const profiles = chronometricProfiles(race);

  for (const item of race.horses) {
    if (isNonRunner(item)) continue;
    const sim = item?.galibiyetBenzerligi;
    if (!sim || typeof sim !== 'object') continue;

    const profile = profiles.get(item);
    if (!profile) continue;

    const base = scoreOf(item, true);
    let nextScore = null;
    let weight = 0;

    if (base !== null) {
      weight = 0.10;
      if (profile.sampleCount >= 2) weight += 0.04;
      if (flatRisk) weight += 0.06;
      if (classRisk) weight += 0.04;
      weight = Math.min(0.24, weight);
      nextScore = Math.round(base * (1 - weight) + profile.chronoScore * weight);
    } else if (profile.sampleCount >= 2) {
      weight = 0.08;
      nextScore = Math.min(84, profile.chronoScore);
    }

    if (nextScore === null) continue;

    const oldScore = finite(sim.score);
    if (oldScore !== nextScore || sim.chronometricScoreF34 !== profile.chronoScore) {
      sim.score = nextScore;
      sim.scoreBeforeChronoRiskF34 = base;
      sim.chronometricScoreF34 = profile.chronoScore;
      sim.chronometricRankF34 = profile.rank;
      sim.chronometricSampleCountF34 = profile.sampleCount;
      sim.chronometricSecondsPer1000F34 = profile.secondsPer1000;
      sim.chronometricWeightF34 = Math.round(weight * 100) / 100;
      sim.scoreSource = [sim.scoreSource, 'CHRONO_RISK_F34'].filter(Boolean).join('+');
      changed = true;
    }
  }

  const stats = topBandStats(race.horses.filter(item => !isNonRunner(item)));
  const chronoCount = profiles.size;
  const finalTags = [...tags];
  if (chronoCount >= 2) finalTags.push('KRONOMETRIK_DESTEK');
  if (nonRunnerCount > 0) finalTags.push('KOSMAZ_FILTRESI');

  const confidence = confidenceFrom(race, stats, finalTags, chronoCount, nonRunnerCount);
  const meta = {
    version:VERSION,
    riskTags:Array.from(new Set(finalTags)),
    topScore:stats.top,
    topGap:stats.gap,
    topBandCount:stats.band,
    scoredHorseCount:stats.scoredCount,
    chronometricHorseCount:chronoCount,
    nonRunnerCount,
    singleConfidence:confidence.singleConfidence,
    recommendedCoverage:confidence.recommendedCoverage,
    reason:confidence.reason
  };

  if (JSON.stringify(race.chronoRiskCalibrationF34 || {}) !== JSON.stringify(meta)) {
    race.chronoRiskCalibrationF34 = meta;
    changed = true;
  }

  return changed;
}

function calibrateCareerResult(result) {
  if (!result || !Array.isArray(result.races)) return false;
  let changed = false;
  for (const race of result.races) {
    if (calibrateRace(race)) changed = true;
  }

  if (result.chronoRiskCalibrationVersion !== VERSION) {
    result.chronoRiskCalibrationVersion = VERSION;
    changed = true;
  }

  const note = 'F34 kronometrik form, kosmaz filtresi ve dar puan bandi riskini son siralamaya ekler.';
  if (!clean(result.similarityNote).includes('F34 kronometrik')) {
    result.similarityNote = [result.similarityNote, note].filter(Boolean).join(' ');
    changed = true;
  }

  return changed;
}

function labelConfidence(value) {
  if (value === 'DUSUK') return 'DÜŞÜK';
  if (value === 'ORTA') return 'ORTA';
  return 'YÜKSEK';
}

function labelTags(tags) {
  const labels = {
    HANDIKAP:'Handikap',
    SATIS:'Satış',
    MAIDEN:'Maiden',
    DAR_PUAN_FARKI:'Dar puan farkı',
    KALABALIK_UST_BANT:'Kalabalık üst bant',
    KRONOMETRIK_DESTEK:'Kronometrik destek',
    KOSMAZ_FILTRESI:'Koşmaz filtresi'
  };
  return (Array.isArray(tags) ? tags : []).map(tag => labels[tag] || tag).join(' · ');
}

if (typeof careerRaceAccordionHtml === 'function') {
  const baseCareerRaceAccordionHtmlF34 = careerRaceAccordionHtml;
  careerRaceAccordionHtml = function(race, forceOpen, ...rest) {
    try { calibrateRace(race); } catch (error) { console.warn('[AT AI]', VERSION, 'race calibration failed', error); }
    let html = baseCareerRaceAccordionHtmlF34.call(this, race, forceOpen, ...rest);
    const meta = race?.chronoRiskCalibrationF34;
    if (!meta || !clean(html).includes('padding:2px 10px 10px 10px')) return html;

    const note = `
      <div style="margin:10px 10px 0 10px;padding:8px 9px;border-radius:8px;background:rgba(56,189,248,.10);border:1px solid rgba(56,189,248,.20);font-size:11px;line-height:1.45;">
        <b>F34 Kalibrasyon</b> · Tek güveni: <b>${esc(labelConfidence(meta.singleConfidence))}</b>
        · Öneri: ilk <b>${esc(meta.recommendedCoverage)}</b> atı kapsa
        ${meta.reason ? `<br><span style="opacity:.72;">${esc(meta.reason)}</span>` : ''}
        ${meta.riskTags?.length ? `<br><span style="opacity:.62;">${esc(labelTags(meta.riskTags))}</span>` : ''}
      </div>
    `;

    return html.replace(
      '<div style="padding:2px 10px 10px 10px;">',
      `${note}\n      <div style="padding:2px 10px 10px 10px;">`
    );
  };
}

if (typeof renderCareerAnalysis === 'function') {
  const baseRenderCareerAnalysisF34 = renderCareerAnalysis;
  renderCareerAnalysis = function(result, raceFilter = null, ...rest) {
    try {
      const changed = calibrateCareerResult(result);
      const st = currentState();
      if (changed && st?.analyses?.career === result && typeof save === 'function') save();
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'render calibration failed', error);
    }
    return baseRenderCareerAnalysisF34.call(this, result, raceFilter, ...rest);
  };
}

if (typeof runCareerAnalysis === 'function') {
  const baseRunCareerAnalysisF34 = runCareerAnalysis;
  runCareerAnalysis = async function(selectedRaces, raceValue, ...rest) {
    const out = await baseRunCareerAnalysisF34.call(this, selectedRaces, raceValue, ...rest);
    try {
      const st = currentState();
      const career = st?.analyses?.career || out;
      const changed = calibrateCareerResult(career);
      if (changed && typeof save === 'function') save();
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'post-run calibration failed', error);
    }
    return out;
  };
}

if (typeof confidenceV11 === 'function') {
  const baseConfidenceV11F34 = confidenceV11;
  confidenceV11 = function(ranking, ...rest) {
    const base = Number(baseConfidenceV11F34.call(this, ranking, ...rest));
    const scored = (Array.isArray(ranking) ? ranking : [])
      .map(item => finite(item?.score))
      .filter(score => score !== null)
      .sort((a, b) => b - a);
    if (!Number.isFinite(base) || scored.length < 2) return base;

    const gap = scored[0] - scored[1];
    const band = scored.filter(score => scored[0] - score <= 2).length;
    let penalty = 0;
    if (gap <= 1) penalty += 28;
    else if (gap <= 2) penalty += 18;
    if (band >= 4) penalty += 20;
    else if (band >= 3) penalty += 10;
    return base - penalty;
  };
}

window.ATCareerChronoRiskCalibrationV1691F34 = {
  version:VERSION,
  calibrate:calibrateCareerResult,
  parseDegreeSeconds
};
console.info('[AT AI]', VERSION, 'active - Career scores now include chronometric/risk calibration.');
})();
