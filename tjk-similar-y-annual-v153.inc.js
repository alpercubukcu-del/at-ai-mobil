
const ANNUAL_ROWS_V153 = `${TJK}/TR/YarisSever/Query/DataRows/YillikYarisProgramiCoklu`;
const PROGRAM_URL_V153 = `${TJK}/TR/YarisSever/Info/Sehir/GunlukYarisProgrami`;

function parseAnnualRowsV153(html = '') {
  const $ = cheerio.load(html || '');
  const rows = [];
  $('tr').each((_, tr) => {
    const $tr = $(tr);
    if ($tr.hasClass('hidable')) return;
    const cells = $tr.find('td').map((__, td) => clean($(td).text())).get();
    if (cells.length < 7) return;
    const pd = parseDisplayDate(cells[0]);
    if (!pd) return;
    rows.push({
      date:pd.display,
      isoDate:pd.iso,
      city:cells[1],
      ageGroup:cells[2],
      class:cells[3],
      distance:Number(String(cells[4] || '').match(/\d{3,4}/)?.[0] || 0),
      track:cells[5]
    });
  });
  const text = clean($.root().text());
  const m = text.match(/Toplam\s+([\d.]+)\s+sonuçtan/i);
  return { rows, total:m ? Number(m[1].replace(/\./g, '')) : rows.length };
}

function annualUrlV153(beginIso, endIso, filters, page = 0) {
  const u = new URL(ANNUAL_ROWS_V153);
  u.searchParams.set('QueryParameter_Tarih_Start', isoToDisplay(beginIso, '/'));
  u.searchParams.set('QueryParameter_Tarih_End', isoToDisplay(endIso, '/'));
  u.searchParams.set('QueryParameter_SehirId', filters.city.value);
  u.searchParams.set('QueryParameter_PistId', filters.track.value);
  if (filters.raceClass?.value) u.searchParams.set('QueryParameter_KosuCinsiId', filters.raceClass.value);
  if (filters.group?.value) u.searchParams.set('QueryParameter_GrupId', filters.group.value);
  if (page > 0) u.searchParams.set('PageNumber', String(page));
  u.searchParams.set('_at', String(Date.now()));
  return u.toString();
}

async function annualWindowV153(target, filters, year, maxPagesLeft = 0) {
  const anchor = anchorIso(target.date, year);
  const beginIso = new Date(Date.parse(`${anchor}T00:00:00Z`) - DAY_WINDOW * 86400000).toISOString().slice(0,10);
  const endIso = new Date(Date.parse(`${anchor}T00:00:00Z`) + DAY_WINDOW * 86400000).toISOString().slice(0,10);
  const first = parseAnnualRowsV153(await fetchText(annualUrlV153(beginIso, endIso, filters, 0), {}, 18000, 2));
  const pages = Math.max(1, Math.ceil(Number(first.total || first.rows.length) / 50));
  const pageLimit = maxPagesLeft ? Math.min(pages, maxPagesLeft) : pages;
  const rows = [...first.rows];
  for (let page = 1; page < pageLimit; page++) {
    const parsed = parseAnnualRowsV153(await fetchText(annualUrlV153(beginIso, endIso, filters, page), {}, 18000, 2));
    rows.push(...parsed.rows);
  }
  const exact = rows.filter(row =>
    normalizeCity(row.city) === normalizeCity(target.city) &&
    ageKey(row.ageGroup) === ageKey(target.ageGroup) &&
    classCoreKey(row.class) === classCoreKey(target.class) &&
    normalizeTrack(row.track) === normalizeTrack(target.track) &&
    Number(row.distance) === Number(target.distance)
  );
  return { anchor, beginIso, endIso, pagesScanned:pageLimit, rows:exact };
}

function programUrlV153(dateIso, target, filters) {
  const u = new URL(PROGRAM_URL_V153);
  u.searchParams.set('Era', 'today');
  u.searchParams.set('QueryParameter_Tarih', isoToDisplay(dateIso, '/'));
  u.searchParams.set('SehirAdi', target.city);
  u.searchParams.set('SehirId', filters.city.value);
  return u.toString();
}

async function resolveAnnualRaceNosV153(rows, target, filters) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.isoDate)) groups.set(row.isoDate, []);
    groups.get(row.isoDate).push(row);
  }
  const out = [];
  for (const [isoDate, dateRows] of groups) {
    const url = programUrlV153(isoDate, target, filters);
    let dayRaces = [];
    try {
      dayRaces = parseProgramRacesV153(await fetchProgramHtmlV153(url));
    } catch {
      continue;
    }
    const candidates = dayRaces.filter(race =>
      classCoreKey(race.class || race.yaradi1) === classCoreKey(target.class) &&
      ageKey(race.ageGroup || race.yaradi2) === ageKey(target.ageGroup) &&
      normalizeTrack(race.track || race.pist) === normalizeTrack(target.track) &&
      Number(race.distance || race.mesafe) === Number(target.distance)
    ).sort((a,b) => Number(a.no || 0) - Number(b.no || 0));

    dateRows.forEach((row, i) => {
      const race = candidates[i] || (candidates.length === 1 ? candidates[0] : null);
      if (!race?.no) return;
      const year = Number(isoDate.slice(0,4));
      const anchor = anchorIso(target.date, year);
      out.push({
        ...row,
        raceNo:Number(race.no),
        classText:race.class || row.class,
        ageGroup:race.ageGroup || row.ageGroup,
        distance:Number(race.distance || row.distance),
        track:displayTrack(race.track || row.track),
        sourceYear:year,
        anchorDate:anchor,
        calendarDayDifference:daysBetween(isoDate, anchor),
        exactCondition:true,
        verification:{
          classMatch:true, ageMatch:true, distanceMatch:true, trackMatch:true,
          url, source:'TJK-YILLIK-PROGRAM+GUNLUK-PROGRAM-V15.3'
        }
      });
    });
  }
  return out;
}

async function queryExactYAnnualV153(target) {
  const filters = await resolveFilters(target);
  if (!filters.city) throw new Error(`TJK şehir filtresi bulunamadı: ${target.city}`);
  if (!filters.track) throw new Error(`TJK pist filtresi bulunamadı: ${target.track}`);
  if (!filters.raceClass) throw new Error(`TJK koşu cinsi filtresi bulunamadı: ${target.class}`);
  if (!filters.group) throw new Error(`TJK yaş grubu filtresi bulunamadı: ${target.ageGroup}`);
  const targetDate = parseIso(target.date);
  if (!targetDate) throw new Error('Hedef tarih YYYY-MM-DD olmalı.');

  const diagnostics = { yearsScanned:0, pagesScanned:0, queryRows:0, candidateRows:0, verifiedRows:0, rejectedRows:0, errors:[], calendarWindowDays:DAY_WINDOW, yDecoratorAnnualPath:true };
  const all = [];
  for (let year = targetDate.year - 1; year >= target.minYear; year--) {
    diagnostics.yearsScanned++;
    try {
      const left = target.maxPages ? Math.max(1, target.maxPages - diagnostics.pagesScanned) : 0;
      const annual = await annualWindowV153(target, filters, year, left);
      diagnostics.pagesScanned += annual.pagesScanned;
      diagnostics.candidateRows += annual.rows.length;
      if (annual.rows.length) {
        const verified = await resolveAnnualRaceNosV153(annual.rows, target, filters);
        diagnostics.verifiedRows += verified.length;
        diagnostics.rejectedRows += Math.max(0, annual.rows.length - verified.length);
        all.push(...verified);
      }
    } catch (e) {
      diagnostics.errors.push(`${year}: ${e?.message || e}`);
    }
    if (target.maxPages && diagnostics.pagesScanned >= target.maxPages) break;
  }

  const seen = new Set(), unique = [];
  for (const row of all.sort((a,b) => String(b.isoDate).localeCompare(String(a.isoDate)))) {
    const k = `${row.isoDate}|${normalizeCity(row.city)}|${row.raceNo}`;
    if (seen.has(k)) continue;
    seen.add(k); unique.push(row);
  }
  return {
    version:VERSION,
    source:'TJK-YillikYarisProgramiCoklu+GunlukYarisProgrami',
    target,
    filters,
    matches:unique,
    diagnostics
  };
}
