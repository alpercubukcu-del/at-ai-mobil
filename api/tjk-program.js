import * as cheerio from 'cheerio';

const TJK = 'https://www.tjk.org';

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'tr-TR,tr;q=0.9,en;q=0.7',
  referer: 'https://www.tjk.org/'
};

function clean(v = '') {
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trDate(iso) {
  const m = String(iso || '').match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!m) return '';

  return `${m[3]}/${m[2]}/${m[1]}`;
}

function absoluteUrl(href = '') {
  try {
    return new URL(href, TJK).href;
  } catch {
    return '';
  }
}

function getAtId($, tr) {
  let id = '';

  $(tr)
    .find('a')
    .each((_, a) => {
      if (id) return;

      const href = $(a).attr('href') || '';

      const m =
        href.match(/QueryParameter_AtId=(\d+)/i) ||
        href.match(/[?&]AtId=(\d+)/i) ||
        href.match(/AtId[=/](\d+)/i);

      if (m) id = m[1];
    });

  return id;
}

function parseRaceCondition(text) {
  const t = clean(text);

  const distance =
    (t.match(/\b(\d{3,4})\s*(?:m\s*)?(?=Çim|Kum|Sentetik)/i) || [])[1] ||
    '';

  const track =
    (t.match(/\b(Çim|Kum|Sentetik)\b/i) || [])[1] || '';

  let raceClass = '';

  const classPatterns = [
    /(?:HANDİKAP|HANDIKAP)\s*\d+(?:\s*\/\s*[A-ZÇĞİÖŞÜ0-9-]+)*/i,
    /ŞARTLI\s*\d+(?:\s*\/\s*[A-ZÇĞİÖŞÜ0-9-]+)*/i,
    /MAIDEN(?:\s*\/\s*[A-ZÇĞİÖŞÜ0-9-]+)*/i,
    /KV-\s*\d+(?:\s*\/\s*[A-ZÇĞİÖŞÜ0-9-]+)*/i,
    /\bG[1-3]\b/i,
    /\bA[1-3]\b/i
  ];

  for (const p of classPatterns) {
    const m = t.match(p);
    if (m) {
      raceClass = clean(m[0]);
      break;
    }
  }

  return {
    class: raceClass,
    distance: distance ? `${distance}m` : '',
    track
  };
}

function parseBetStarts(text) {
  const t = clean(text).toLocaleUpperCase('tr-TR');

  const patterns = [
    ['7li Ganyan', /7['’]?\s*Lİ\s+GANYAN/],
    ['7li Plase', /7['’]?\s*Lİ\s+PLASE/],
    ['1. 6lı Ganyan', /1\.\s*6['’]?\s*LI\s+GANYAN/],
    ['2. 6lı Ganyan', /2\.\s*6['’]?\s*LI\s+GANYAN/],
    ['1. 5li Ganyan', /1\.\s*5['’]?\s*Lİ\s+GANYAN/],
    ['2. 5li Ganyan', /2\.\s*5['’]?\s*Lİ\s+GANYAN/],
    ['1. 3lü Ganyan', /1\.\s*3['’]?\s*LÜ\s+GANYAN/],
    ['2. 3lü Ganyan', /2\.\s*3['’]?\s*LÜ\s+GANYAN/],
    ['4lü Ganyan', /(?:^|\s)4['’]?\s*LÜ\s+GANYAN/]
  ];

  const out = [];

  for (const [name, re] of patterns) {
    if (re.test(t) && !out.includes(name)) {
      out.push(name);
    }
  }

  return out;
}

function tableHeaders($, table) {
  let headers = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      headers.push(clean($(th).text()));
    });

  if (!headers.length) {
    const first = $(table).find('tr').first();

    first.find('th,td').each((_, x) => {
      headers.push(clean($(x).text()));
    });
  }

  return headers;
}

function headerIndex(headers, re) {
  return headers.findIndex(x => re.test(x));
}

function parseHorseTable($, table) {
  const headers = tableHeaders($, table);

  const idx = {
    n: headerIndex(headers, /^N$/i),
    name: headerIndex(headers, /At İsmi|At Ismi/i),
    age: headerIndex(headers, /^Yaş$|^Yas$/i),
    weight: headerIndex(headers, /Sıklet|Siklet/i),
    jockey: headerIndex(headers, /Jokey/i),
    owner: headerIndex(headers, /Sahip/i),
    trainer: headerIndex(headers, /Antrenör|Antrenor/i),
    st: headerIndex(headers, /^St$/i),
    hp: headerIndex(headers, /^HP$/i),
    last6: headerIndex(headers, /Son 6/i),
    kgs: headerIndex(headers, /^KGS$/i),
    s20: headerIndex(headers, /^s20$/i),
    odds: headerIndex(headers, /^Gny$/i),
    agf: headerIndex(headers, /^AGF$/i)
  };

  const horses = [];

  $(table)
    .find('tbody tr')
    .each((_, tr) => {
      const cells = [];

      $(tr)
        .find('td')
        .each((__, td) => {
          cells.push(clean($(td).text()));
        });

      if (!cells.length) return;

      const get = key => {
        const i = idx[key];
        return i >= 0 ? clean(cells[i] || '') : '';
      };

      const noRaw = get('n');
      const no = Number(String(noRaw).replace(/\D/g, ''));

      const name = get('name');

      if (!Number.isFinite(no) || no <= 0 || !name) return;

      horses.push({
        no,
        id: getAtId($, tr),
        name,
        age: get('age'),
        weight: get('weight'),
        jockey: get('jockey'),
        owner: get('owner'),
        trainer: get('trainer'),
        st: get('st'),
        hp: get('hp'),
        last6: get('last6'),
        kgs: get('kgs'),
        s20: get('s20'),
        odds: get('odds'),
        agf: get('agf')
      });
    });

  return horses;
}

function findRaceSections($) {
  const starts = [];

  $('h1,h2,h3,h4,h5,h6,strong,b,div,span').each((_, el) => {
    const txt = clean($(el).clone().children().remove().end().text());

    const m = txt.match(
      /^(\d{1,2})\.\s*Koşu\s+(\d{1,2}[.:]\d{2})$/i
    );

    if (!m) return;

    const no = Number(m[1]);

    if (!starts.some(x => x.no === no)) {
      starts.push({
        no,
        time: m[2].replace(':', '.'),
        el
      });
    }
  });

  starts.sort((a, b) => a.no - b.no);

  return starts;
}

function parseRaces($) {
  const starts = findRaceSections($);
  const races = [];

  for (const start of starts) {
    const $start = $(start.el);

    let node = $start;
    let conditionText = '';
    let sectionText = '';
    let horseTable = null;

    for (let step = 0; step < 120; step++) {
      node = node.next();

      if (!node.length) break;

      const txt = clean(node.text());

      const nextRace = txt.match(
        /^(\d{1,2})\.\s*Koşu\s+\d{1,2}[.:]\d{2}$/i
      );

      if (
        nextRace &&
        Number(nextRace[1]) !== start.no
      ) {
        break;
      }

      if (txt) {
        sectionText += ' ' + txt;
      }

      if (
        !conditionText &&
        /\b(Çim|Kum|Sentetik)\b/i.test(txt) &&
        /\b\d{3,4}\b/.test(txt)
      ) {
        conditionText = txt;
      }

      if (node.is('table')) {
        const heads = tableHeaders($, node);

        if (
          heads.some(x => /At İsmi|At Ismi/i.test(x)) &&
          heads.some(x => /^N$/i.test(x))
        ) {
          horseTable = node;
          break;
        }
      }

      const nestedTables = node.find('table');

      nestedTables.each((_, table) => {
        if (horseTable) return;

        const heads = tableHeaders($, table);

        if (
          heads.some(x => /At İsmi|At Ismi/i.test(x)) &&
          heads.some(x => /^N$/i.test(x))
        ) {
          horseTable = $(table);
        }
      });

      if (horseTable) break;
    }

    // Bazı TJK sayfalarında başlık ve tablo farklı kapsayıcılarda.
    // Bulunamazsa, sayfadaki at tablolarını sıra ile eşleştir.
    if (!horseTable) {
      const candidates = [];

      $('table').each((_, table) => {
        const heads = tableHeaders($, table);

        if (
          heads.some(x => /At İsmi|At Ismi/i.test(x)) &&
          heads.some(x => /^N$/i.test(x))
        ) {
          candidates.push($(table));
        }
      });

      horseTable = candidates[start.no - 1] || null;
    }

    const cond = parseRaceCondition(
      conditionText || sectionText
    );

    races.push({
      no: start.no,
      time: start.time,
      class: cond.class,
      distance: cond.distance,
      track: cond.track,
      betStarts: parseBetStarts(sectionText),
      horses: horseTable
        ? parseHorseTable($, horseTable)
        : []
    });
  }

  return races.filter(r => r.no > 0);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: HEADERS,
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(
      `TJK HTTP ${response.status}`
    );
  }

  return await response.text();
}

export default async function handler(req, res) {
  try {
    const date =
      String(req.query.date || '').trim() ||
      new Date().toISOString().slice(0, 10);

    const formatted = trDate(date);

    if (!formatted) {
      return res.status(400).json({
        error: 'Tarih YYYY-MM-DD biçiminde olmalı.'
      });
    }

    // Önce günlük ana programdan şehirleri bul.
    const mainUrl =
      `${TJK}/TR/YarisSever/Info/Page/GunlukYarisProgrami` +
      `?QueryParameter_Tarih=${encodeURIComponent(formatted)}`;

    const mainHtml = await fetchHtml(mainUrl);
    const $main = cheerio.load(mainHtml);

    const citiesMap = new Map();

    $main('a[href*="GunlukYarisProgrami"]').each((_, a) => {
      const href = $main(a).attr('href') || '';

      const idMatch = href.match(/[?&]SehirId=(\d+)/i);
      if (!idMatch) return;

      const id = idMatch[1];

      let name = clean($main(a).text());

      if (!name) {
        try {
          const u = new URL(absoluteUrl(href));
          name = clean(
            decodeURIComponent(
              u.searchParams.get('SehirAdi') || ''
            )
          );
        } catch {}
      }

      if (!name) return;

      if (!citiesMap.has(id)) {
        citiesMap.set(id, {
          id,
          name,
          href: absoluteUrl(href)
        });
      }
    });

    const cities = [...citiesMap.values()];

    const racesByCity = {};

    // Günlük ana programda bulunan bütün şehirleri işle.
    for (const city of cities) {
      try {
        const cityUrl =
          `${TJK}/TR/YarisSever/Info/Sehir/GunlukYarisProgrami` +
          `?SehirId=${encodeURIComponent(city.id)}` +
          `&QueryParameter_Tarih=${encodeURIComponent(formatted)}` +
          `&SehirAdi=${encodeURIComponent(
            city.name
              .replace(/\s*\([^)]*\)\s*$/, '')
              .trim()
          )}` +
          `&Era=today`;

        const html = await fetchHtml(cityUrl);
        const $ = cheerio.load(html);

        racesByCity[String(city.id)] = parseRaces($);
      } catch (err) {
        racesByCity[String(city.id)] = [];
      }
    }

    const raceCount = Object.values(racesByCity)
      .reduce(
        (sum, arr) =>
          sum + (Array.isArray(arr) ? arr.length : 0),
        0
      );

    const horseCount = Object.values(racesByCity)
      .flat()
      .reduce(
        (sum, race) =>
          sum +
          (Array.isArray(race.horses)
            ? race.horses.length
            : 0),
        0
      );

    res.setHeader(
      'Cache-Control',
      's-maxage=120, stale-while-revalidate=300'
    );

    return res.status(200).json({
      ok: true,
      date,
      cityCount: cities.length,
      raceCount,
      horseCount,
      cities,
      racesByCity
    });
  } catch (err) {
    console.error('tjk-program:', err);

    return res.status(500).json({
      ok: false,
      error: err?.message || 'TJK programı alınamadı.'
    });
  }
}
