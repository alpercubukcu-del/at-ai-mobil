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

async function fetchHtml(url) {
  const r = await fetch(url, {
    headers: HEADERS,
    redirect: 'follow'
  });

  if (!r.ok) {
    throw new Error(`TJK HTTP ${r.status}`);
  }

  return await r.text();
}

function getAtId($, tr) {
  let id = '';

  $(tr).find('a').each((_, a) => {
    if (id) return;

    const href = $(a).attr('href') || '';

    const m =
      href.match(/QueryParameter_AtId=(\d+)/i) ||
      href.match(/[?&]AtId=(\d+)/i);

    if (m) id = m[1];
  });

  return id;
}

function tableHeaders($, table) {
  let out = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      out.push(clean($(th).text()));
    });

  if (!out.length) {
    $(table)
      .find('tr')
      .first()
      .find('th,td')
      .each((_, x) => {
        out.push(clean($(x).text()));
      });
  }

  return out;
}

function findHeader(headers, re) {
  return headers.findIndex(x => re.test(x));
}

function isHorseTable($, table) {
  const h = tableHeaders($, table);

  return (
    h.some(x => /^N$/i.test(x)) &&
    h.some(x => /At İsmi|At Ismi/i.test(x)) &&
    h.some(x => /Jokey/i.test(x))
  );
}

function parseHorseTable($, table) {
  const headers = tableHeaders($, table);

  const ix = {
    n: findHeader(headers, /^N$/i),
    name: findHeader(headers, /At İsmi|At Ismi/i),
    age: findHeader(headers, /Yaş|Yas/i),
    weight: findHeader(headers, /Sıklet|Siklet/i),
    jockey: findHeader(headers, /Jokey/i),
    owner: findHeader(headers, /Sahip/i),
    trainer: findHeader(headers, /Antrenör|Antrenor/i),
    st: findHeader(headers, /^St$/i),
    hp: findHeader(headers, /^HP$/i),
    last6: findHeader(headers, /Son 6/i),
    kgs: findHeader(headers, /^KGS$/i),
    s20: findHeader(headers, /^s20$/i),
    odds: findHeader(headers, /^Gny$/i),
    agf: findHeader(headers, /^AGF$/i)
  };

  const horses = [];

  $(table)
    .find('tbody tr')
    .each((_, tr) => {
      const cells = $(tr)
        .find('td')
        .map((__, td) => clean($(td).text()))
        .get();

      if (!cells.length) return;

      const val = key => {
        const i = ix[key];
        return i >= 0 ? clean(cells[i] || '') : '';
      };

      const no = Number(
        String(val('n')).replace(/[^\d]/g, '')
      );

      const name = val('name');

      if (!no || !name) return;

      horses.push({
        no,
        id: getAtId($, tr),
        name,
        age: val('age'),
        weight: val('weight'),
        jockey: val('jockey'),
        owner: val('owner'),
        trainer: val('trainer'),
        st: val('st'),
        hp: val('hp'),
        last6: val('last6'),
        kgs: val('kgs'),
        s20: val('s20'),
        odds: val('odds'),
        agf: val('agf')
      });
    });

  return horses;
}

function parseCondition(text = '') {
  const t = clean(text);

  const distance =
    (t.match(
      /\b(\d{3,4})\s*(?:m\s*)?(Çim|Kum|Sentetik)\b/i
    ) || []);

  const raceClass =
    (
      t.match(
        /(Maiden(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?|Handikap\s*\d+(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?|Şartlı\s*\d+(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?|KV-\s*\d+(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?|\bG[1-3]\b|\bA[1-3]\b)/i
      ) || []
    )[0] || '';

  return {
    class: clean(raceClass),
    distance: distance[1]
      ? `${distance[1]}m`
      : '',
    track: distance[2] || ''
  };
}

function parseBetStarts(text = '') {
  const t = clean(text).toLocaleUpperCase('tr-TR');

  const defs = [
    ['7li Ganyan', /7['’]?\s*Lİ\s+GANYAN/],
    ['7li Plase', /7['’]?\s*Lİ\s+PLASE/],
    ['1. 6lı Ganyan', /1\.\s*6['’]?\s*LI\s+GANYAN/],
    ['2. 6lı Ganyan', /2\.\s*6['’]?\s*LI\s+GANYAN/],
    ['1. 5li Ganyan', /1\.\s*5['’]?\s*Lİ\s+GANYAN/],
    ['2. 5li Ganyan', /2\.\s*5['’]?\s*Lİ\s+GANYAN/],
    ['1. 3lü Ganyan', /1\.\s*3['’]?\s*LÜ\s+GANYAN/],
    ['2. 3lü Ganyan', /2\.\s*3['’]?\s*LÜ\s+GANYAN/],
    ['4lü Ganyan', /4['’]?\s*LÜ\s+GANYAN/]
  ];

  return defs
    .filter(([, re]) => re.test(t))
    .map(([name]) => name);
}

function raceHeading(text = '') {
  const t = clean(text);

  const m = t.match(
    /^(\d{1,2})\.\s*Koşu\s*:?\s*(\d{1,2}[.:]\d{2})(?:\s|$)/i
  );

  if (!m) return null;

  return {
    no: Number(m[1]),
    time: m[2].replace(':', '.')
  };
}

function parseRaces($) {
  /*
    KRİTİK DÜZELTME:
    TJK aynı koşu başlığını üst menüde ve gerçek yarış
    bölümünde iki kez gösteriyor.

    Bu nedenle yarış başlıklarına güvenmek yerine
    gerçek AT TABLOLARINI esas alıyoruz.
  */

  const horseTables = [];

  $('table').each((_, table) => {
    if (isHorseTable($, table)) {
      horseTables.push(table);
    }
  });

  if (!horseTables.length) {
    return [];
  }

  /*
    Gerçek yarış başlıklarını sayfa sırasıyla topluyoruz.
    Aynı koşu numarasının SON görülen başlığı gerçek
    yarış bölümüdür.
  */

  const lastHeadingByRace = new Map();

  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const r = raceHeading($(el).text());

    if (r) {
      lastHeadingByRace.set(r.no, {
        ...r,
        el
      });
    }
  });

  const headings = [...lastHeadingByRace.values()]
    .sort((a, b) => a.no - b.no);

  const races = [];

  /*
    TJK'de program at tabloları yarış sırasındadır.
    Dolayısıyla:
      1. at tablosu = 1. koşu
      2. at tablosu = 2. koşu
      ...
  */

  horseTables.forEach((table, index) => {
    const raceNo =
      headings[index]?.no ||
      index + 1;

    const time =
      headings[index]?.time || '';

    /*
      Tabloya en yakın önceki başlık/metinlerden
      yarış şartını toplamaya çalış.
    */

    let context = '';
    let node = $(table);

    for (let i = 0; i < 40; i++) {
      node = node.prev();

      if (!node.length) break;

      const txt = clean(node.text());

      if (!txt) continue;

      context =
        txt + ' ' + context;

      const h = raceHeading(txt);

      if (h && h.no === raceNo) {
        break;
      }

      if (h && h.no !== raceNo) {
        break;
      }
    }

    /*
      Tablo bir div içindeyse sibling araması yetmeyebilir.
      Parent üzerinden de yukarı çık.
    */

    if (
      !/\b(Çim|Kum|Sentetik)\b/i.test(context)
    ) {
      let parent = $(table).parent();

      for (let level = 0; level < 6; level++) {
        if (!parent.length) break;

        const txt = clean(parent.text());

        if (
          txt &&
          /\b(Çim|Kum|Sentetik)\b/i.test(txt)
        ) {
          context = txt;
          break;
        }

        parent = parent.parent();
      }
    }

    /*
      Hâlâ şart bulunamazsa, yarış başlığından tabloya
      kadar olan HTML metnini document sıra numarasıyla
      destekle.
    */

    if (
      !/\b(Çim|Kum|Sentetik)\b/i.test(context)
    ) {
      const pageText = clean($.root().text());

      const pattern = new RegExp(
        `${raceNo}\\.\\s*Koşu\\s*:?\\s*${time.replace(
          '.',
          '[.:]'
        )}([\\s\\S]{0,1000}?)(?=${
          raceNo + 1
        }\\.\\s*Koşu|Forma\\s+N\\s+At İsmi)`,
        'i'
      );

      const m = pageText.match(pattern);

      if (m) {
        context = clean(m[1]);
      }
    }

    const condition = parseCondition(context);

    const horses = parseHorseTable(
      $,
      table
    );

    races.push({
      no: raceNo,
      time,
      class: condition.class,
      distance: condition.distance,
      track: condition.track,
      betStarts: parseBetStarts(context),
      horses
    });
  });

  return races
    .filter(r => r.horses.length > 0)
    .sort((a, b) => a.no - b.no);
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

    const mainUrl =
      `${TJK}/TR/YarisSever/Info/Page/GunlukYarisProgrami` +
      `?QueryParameter_Tarih=${encodeURIComponent(
        formatted
      )}`;

    const mainHtml = await fetchHtml(mainUrl);

    const $main = cheerio.load(mainHtml);

    const cityMap = new Map();

    $main(
      'a[href*="GunlukYarisProgrami"]'
    ).each((_, a) => {
      const href =
        $main(a).attr('href') || '';

      const m = href.match(
        /[?&]SehirId=(\d+)/i
      );

      if (!m) return;

      const id = m[1];

      let name =
        clean($main(a).text());

      if (!name) {
        try {
          const u = new URL(
            absoluteUrl(href)
          );

          name = clean(
            decodeURIComponent(
              u.searchParams.get(
                'SehirAdi'
              ) || ''
            )
          );
        } catch {}
      }

      if (!name) return;

      if (!cityMap.has(id)) {
        cityMap.set(id, {
          id,
          name,
          href: absoluteUrl(href)
        });
      }
    });

    const cities =
      [...cityMap.values()];

    const racesByCity = {};

    for (const city of cities) {
      try {
        /*
          Burada şehir adını yeniden üretmek yerine
          TJK'nin ana sayfadan verdiği GERÇEK href'i
          kullanıyoruz.
        */

        let cityUrl =
          city.href;

        if (!cityUrl) {
          racesByCity[city.id] = [];
          continue;
        }

        /*
          Tarih parametresi mevcut href'de zaten geliyor.
          URL'yi olduğu haliyle kullanmak kritik.
        */

        const html =
          await fetchHtml(cityUrl);

        const $ =
          cheerio.load(html);

        const races =
          parseRaces($);

        racesByCity[
          String(city.id)
        ] = races;
      } catch (err) {
        console.error(
          'CITY ERROR',
          city.id,
          city.name,
          err.message
        );

        racesByCity[
          String(city.id)
        ] = [];
      }
    }

    const raceCount =
      Object.values(racesByCity)
        .reduce(
          (sum, races) =>
            sum +
            (
              Array.isArray(races)
                ? races.length
                : 0
            ),
          0
        );

    const horseCount =
      Object.values(racesByCity)
        .flat()
        .reduce(
          (sum, race) =>
            sum +
            (
              Array.isArray(
                race.horses
              )
                ? race.horses.length
                : 0
            ),
          0
        );

    res.setHeader(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=120'
    );

    return res.status(200).json({
      ok: true,
      parserVersion:
        'TJK-PARSER-V3',
      date,
      cityCount:
        cities.length,
      raceCount,
      horseCount,
      cities,
      racesByCity
    });
  } catch (err) {
    console.error(
      'tjk-program:',
      err
    );

    return res.status(500).json({
      ok: false,
      error:
        err?.message ||
        'TJK programı alınamadı.'
    });
  }
      }
