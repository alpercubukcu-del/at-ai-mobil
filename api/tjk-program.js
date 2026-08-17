import * as cheerio from 'cheerio';

const VERSION = 'TJK-PARSER-V4.2';
const ROOT_URL =
  'https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisProgrami';
const CITY_URL =
  'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.7,en;q=0.6',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

function clean(value = '') {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function one(value = '') {
  return clean(value)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function key(value = '') {
  return one(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isoToTrDate(iso) {
  const m = String(iso || '').match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function numberValue(value) {
  const t = one(value);
  if (!t || /^[-–—]$/.test(t)) return null;

  let s = t
    .replace(/%/g, '')
    .replace(/\s+/g, '');

  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function integerValue(value) {
  const m = one(value).match(/\d+/);
  return m ? Number(m[0]) : null;
}

function absoluteUrl(href = '') {
  try {
    return new URL(
      String(href || '').replace(/&amp;/gi, '&'),
      'https://www.tjk.org'
    ).toString();
  } catch {
    return '';
  }
}

function queryId(href = '', names = []) {
  const h = String(href || '').replace(/&amp;/gi, '&');

  for (const name of names) {
    const m = h.match(
      new RegExp(`(?:[?&])${name}=(\\d+)`, 'i')
    );
    if (m) return Number(m[1]);
  }

  return null;
}

function stripTooltipNodes($, el) {
  const c = $(el).clone();

  c.find(
    [
      '.tooltip',
      '.tooltip-inner',
      '.popover',
      '[role="tooltip"]',
      'script',
      'style',
      'noscript',
      '[style*="display:none"]',
      '[style*="display: none"]',
      '[style*="visibility:hidden"]',
      '[style*="visibility: hidden"]'
    ].join(',')
  ).remove();

  return c;
}

function cellText($, el) {
  if (!el) return '';
  return one(stripTooltipNodes($, el).text());
}

function linkInfo($, el, hints = []) {
  if (!el) {
    return { text: '', href: '' };
  }

  let result = null;

  $(el).find('a[href]').each((_, a) => {
    if (result) return;

    const href = String($(a).attr('href') || '');
    if (
      hints.length &&
      !hints.some(h =>
        href.toLocaleLowerCase('tr-TR')
          .includes(h.toLocaleLowerCase('tr-TR'))
      )
    ) {
      return;
    }

    const clone = $(a).clone();
    clone.find(
      'span,sup,small,.tooltip,.tooltip-inner,.popover,[role="tooltip"]'
    ).remove();

    const text = one(clone.text());
    if (text) {
      result = { text, href };
    }
  });

  if (result) return result;

  $(el).find('a[href]').each((_, a) => {
    if (result) return;

    const clone = $(a).clone();
    clone.find(
      'span,sup,small,.tooltip,.tooltip-inner,.popover,[role="tooltip"]'
    ).remove();

    const text = one(clone.text());
    if (text) {
      result = {
        text,
        href: String($(a).attr('href') || '')
      };
    }
  });

  return result || {
    text: '',
    href: ''
  };
}

function cleanHorseName(value = '') {
  let t = one(value);

  const stops = [
    /\bKG\s*Kapalı gözlük/i,
    /\bK\s*Kulaklık takılacağını/i,
    /\bDB\s*Dilinin bağlanacağını/i,
    /\bSKG\s*Ring mahalinden/i,
    /\bSK\s*Ring mahalinden/i,
    /\bGKR\s*Göz koruyucu/i,
    /\bYP\s*Yanak peluşu/i,
    /\bAP\s*Apranti\b/i,
    /\(Satılık\)/i
  ];

  let cut = t.length;

  for (const re of stops) {
    const m = t.match(re);
    if (m && m.index < cut) cut = m.index;
  }

  return t
    .slice(0, cut)
    .replace(/\s+t\d[\d.,]*\s*TL.*$/i, '')
    .trim();
}

function cleanJockey(value = '') {
  return one(value)
    .replace(/APApranti/gi, 'AP')
    .replace(/\bApranti\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRaceTitle(value = '') {
  const t = one(value);

  const m = t.match(
    /(\d+)\s*\.\s*Koşu\s*:?\s*(\d{1,2}[.:]\d{2})?/i
  );

  if (!m) return null;

  return {
    no: Number(m[1]),
    time: m[2] ? m[2].replace('.', ':') : ''
  };
}

function extractAgeGroup(value = '') {
  const t = one(value);

  const patterns = [
    /(\d+\s+ve\s+Yukarı\s+İngilizler)/i,
    /(\d+\s+ve\s+Yukarı\s+Araplar)/i,
    /(\d+\s+Yaşlı\s+İngilizler)/i,
    /(\d+\s+Yaşlı\s+Araplar)/i,
    /(\d+\s*Y\s*İngilizler)/i,
    /(\d+\s*Y\s*Araplar)/i,
    /(\d+\+\s*İngilizler)/i,
    /(\d+\+\s*Araplar)/i
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m) return one(m[1]);
  }

  return '';
}

function extractDistanceTrack(value = '') {
  const m = one(value).match(
    /(\d{3,4})\s*m?\s*(Çim|Kum|Sentetik)\b/i
  );

  if (!m) {
    return {
      distance: null,
      track: ''
    };
  }

  const lower =
    m[2].toLocaleLowerCase('tr-TR');

  const track =
    lower === 'çim'
      ? 'Çim'
      : lower === 'kum'
        ? 'Kum'
        : 'Sentetik';

  return {
    distance: Number(m[1]),
    track
  };
}

/*
  Masaüstündeki çalışan ProgramCollector mantığı:
  resmi koşu şartı virgülle ayrılır.

  Örnek:
  Maiden/DHÖW , 3 Yaşlı Araplar, 57 kg, 1200 Çim

  yaradi1 = Maiden/DHÖW
  yaradi2 = 3 Yaşlı Araplar
  yaradi3 = 57 kg
*/
function splitRaceCondition(value = '') {
  let t = one(value)
    .replace(/E\.?\s*İ\.?\s*D\.?\s*:.*$/i, '')
    .replace(/\bImage\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const dt = extractDistanceTrack(t);
  const ageGroup = extractAgeGroup(t);

  let beforeDistance = t;
  const dm = t.match(
    /(\d{3,4})\s*m?\s*(Çim|Kum|Sentetik)\b/i
  );

  if (dm && typeof dm.index === 'number') {
    beforeDistance = t.slice(0, dm.index);
  }

  const parts = beforeDistance
    .split(',')
    .map(one)
    .filter(Boolean);

  let ageIndex = parts.findIndex(
    p => Boolean(extractAgeGroup(p))
  );

  let yaradi1 = '';
  let yaradi2 = ageGroup;
  let yaradi3 = '';

  if (ageIndex >= 0) {
    yaradi1 = parts
      .slice(0, ageIndex)
      .join(', ')
      .trim();

    yaradi2 =
      extractAgeGroup(parts[ageIndex]) ||
      parts[ageIndex];

    const rest = parts
      .slice(ageIndex + 1)
      .map(one)
      .filter(Boolean);

    if (rest.length) {
      yaradi3 = rest.join(', ');
    }
  } else {
    // Yaş grubu bulunamazsa ilk parça sınıf olarak kalır.
    yaradi1 = parts[0] || '';
  }

  yaradi1 = yaradi1
    .replace(/^\d+\s*\.\s*Koşu\s*:?\s*\d{0,2}[.:]?\d{0,2}/i, '')
    .replace(/\s*\/\s*/g, '/')
    .trim();

  return {
    class: yaradi1,
    ageGroup: yaradi2,
    condition: yaradi3,
    yaradi1,
    yaradi2,
    yaradi3,
    distance: dt.distance,
    track: dt.track,
    raw: t
  };
}

function findPreviousElement(node, predicate) {
  let cur = node;

  while (cur) {
    let sib = cur.prev;

    while (sib) {
      const found = findLastInSubtree(sib, predicate);
      if (found) return found;
      sib = sib.prev;
    }

    cur = cur.parent;
  }

  return null;
}

function findLastInSubtree(node, predicate) {
  if (!node) return null;

  if (node.children?.length) {
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      const found = findLastInSubtree(
        node.children[i],
        predicate
      );
      if (found) return found;
    }
  }

  return predicate(node) ? node : null;
}

function tagName(node) {
  return String(node?.name || '').toLowerCase();
}

function isHeadingNode(node) {
  return /^h[1-6]$/.test(tagName(node));
}

function closestRaceContext($, table) {
  /*
    BeautifulSoup'taki:
      table.find_previous("h3")
    davranışını DOM üzerinde bire bir taklit ediyoruz.

    Tablodan geriye doğru ilk H3 = koşu şartı,
    bir önceki yarış başlıklı H3 = "N. Koşu HH.MM".
  */
  const firstH3 =
    findPreviousElement(
      table,
      node => tagName(node) === 'h3'
    );

  if (!firstH3) return null;

  const firstText = one($(firstH3).text());

  // Bazı TJK sayfalarında doğrudan ilk H3 yarış başlığı olabilir.
  let conditionNode = null;
  let raceNode = null;
  let raceTitle = parseRaceTitle(firstText);

  if (raceTitle) {
    raceNode = firstH3;
  } else {
    conditionNode = firstH3;

    let cursor = firstH3;

    for (let guard = 0; guard < 20; guard += 1) {
      const prev =
        findPreviousElement(
          cursor,
          node => tagName(node) === 'h3'
        );

      if (!prev) break;

      const parsed =
        parseRaceTitle($(prev).text());

      if (parsed) {
        raceNode = prev;
        raceTitle = parsed;
        break;
      }

      cursor = prev;
    }
  }

  if (!raceNode || !raceTitle) {
    return null;
  }

  // İlk H3 yarış başlığı ise, ondan sonraki koşul H3'ünü tablo öncesinde ara.
  if (!conditionNode) {
    const candidates = [];
    let n = raceNode.next;

    while (n && n !== table) {
      if (
        tagName(n) === 'h3' &&
        !parseRaceTitle($(n).text())
      ) {
        const txt = one($(n).text());
        if (
          extractAgeGroup(txt) ||
          extractDistanceTrack(txt).distance
        ) {
          candidates.push(n);
        }
      }

      n = n.next;
    }

    conditionNode =
      candidates[candidates.length - 1] || null;
  }

  const conditionText =
    conditionNode
      ? one($(conditionNode).text())
      : '';

  return {
    no: raceTitle.no,
    time: raceTitle.time,
    raceNode,
    conditionNode,
    conditionText
  };
}

function tableHeaderLabels($, table) {
  let cells =
    $(table).find('thead tr').first().find('th,td').toArray();

  if (!cells.length) {
    const rows = $(table).find('tr').toArray();

    for (const row of rows) {
      const candidates =
        $(row).find('th,td').toArray();

      const joined =
        candidates.map(x => key($(x).text())).join(' | ');

      if (
        joined.includes('at ismi') &&
        (
          joined.includes('jokey') ||
          joined.includes('siklet')
        )
      ) {
        cells = candidates;
        break;
      }
    }
  }

  return cells.map(x => key($(x).text()));
}

function findCellByClass($, row, token) {
  let found = null;

  $(row).find('td').each((_, td) => {
    if (found) return;

    const cls =
      String($(td).attr('class') || '');

    if (cls.includes(token)) {
      found = td;
    }
  });

  return found;
}

function rowMap($, row, labels) {
  const tds = $(row).find('td').toArray();
  const map = {};

  labels.forEach((label, i) => {
    if (tds[i]) map[label] = tds[i];
  });

  return { map, tds };
}

function firstCell(map, aliases) {
  for (const a of aliases) {
    if (map[a]) return map[a];
  }
  return null;
}

function splitOrigin(value = '') {
  const raw = one(value);
  let left = raw;
  let damsire = '';

  if (raw.includes('/')) {
    const i = raw.lastIndexOf('/');
    left = raw.slice(0, i);
    damsire = one(raw.slice(i + 1));
  }

  let sire = '';
  let dam = '';

  const dash = left.indexOf('-');

  if (dash >= 0) {
    sire = one(left.slice(0, dash));
    dam = one(left.slice(dash + 1));
  } else {
    sire = one(left);
  }

  return {
    origin: raw,
    sire,
    dam,
    damsire
  };
}

function parseAge(value = '') {
  const raw = one(value);
  const m = raw.match(
    /(\d+)\s*y\s*([a-zçğıöşü])?\s*([a-zçğıöşü])?/i
  );

  return {
    raw,
    years: m ? Number(m[1]) : null,
    color: m?.[2] || '',
    sex: m?.[3] || ''
  };
}

function parseAgf(value = '') {
  const raw = one(value);

  const valueMatch =
    raw.match(/%?\s*(\d+(?:[.,]\d+)?)/);

  const rankMatch =
    raw.match(/\((\d+)\)/);

  return {
    value: valueMatch
      ? Number(valueMatch[1].replace(',', '.'))
      : null,
    rank: rankMatch
      ? Number(rankMatch[1])
      : null
  };
}

function horseFromRow($, row, labels) {
  const { map, tds } =
    rowMap($, row, labels);

  const horseCell =
    findCellByClass(
      $,
      row,
      'GunlukYarisProgrami-AtAdi'
    ) ||
    firstCell(
      map,
      ['at ismi', 'at adi']
    );

  if (!horseCell) return null;

  const horse =
    linkInfo(
      $,
      horseCell,
      [
        'QueryParameter_AtId=',
        'AtKosuBilgileri'
      ]
    );

  const horseName =
    cleanHorseName(
      horse.text ||
      cellText($, horseCell)
    );

  if (!horseName) return null;

  const noCell =
    firstCell(
      map,
      ['n', 'no', 'at no']
    ) ||
    tds[1] ||
    tds[0];

  const no =
    integerValue(
      cellText($, noCell)
    );

  if (!no) return null;

  const ageCell =
    firstCell(map, ['yas']);

  const originCell =
    firstCell(
      map,
      ['orijin baba anne', 'orijin']
    );

  const weightCell =
    firstCell(
      map,
      ['siklet', 'kilo']
    );

  const jockeyCell =
    findCellByClass(
      $,
      row,
      'JokeAdi'
    ) ||
    firstCell(map, ['jokey']);

  const ownerCell =
    findCellByClass(
      $,
      row,
      'SahipAdi'
    ) ||
    firstCell(map, ['sahip']);

  const trainerCell =
    findCellByClass(
      $,
      row,
      'AntronorAdi'
    ) ||
    findCellByClass(
      $,
      row,
      'AntrenorAdi'
    ) ||
    firstCell(map, ['antrenor']);

  const stCell =
    firstCell(
      map,
      ['st', 'kulvar']
    );

  const hpCell =
    firstCell(map, ['hp']);

  const last6Cell =
    firstCell(
      map,
      ['son 6 y', 'son 6', 'son6']
    );

  const kgsCell =
    firstCell(map, ['kgs']);

  const s20Cell =
    firstCell(map, ['s20']);

  const bestCell =
    firstCell(
      map,
      ['en iyi d', 'en iyi derece']
    );

  const oddsCell =
    firstCell(
      map,
      ['gny', 'ganyan']
    );

  const agfCell =
    firstCell(map, ['agf']);

  const age =
    parseAge(cellText($, ageCell));

  const origin =
    splitOrigin(cellText($, originCell));

  const jockeyLink =
    linkInfo($, jockeyCell);

  const ownerLink =
    linkInfo($, ownerCell);

  const trainerLink =
    linkInfo($, trainerCell);

  const jockey =
    cleanJockey(
      jockeyLink.text ||
      cellText($, jockeyCell)
    );

  const owner =
    one(
      ownerLink.text ||
      cellText($, ownerCell)
    );

  const trainer =
    one(
      trainerLink.text ||
      cellText($, trainerCell)
    );

  const agf =
    parseAgf(cellText($, agfCell));

  return {
    no,

    id:
      queryId(
        horse.href,
        [
          'QueryParameter_AtId',
          'AtId'
        ]
      ),

    name: horseName,

    age: age.raw,
    ageYears: age.years,
    color: age.color,
    sex: age.sex,

    origin: origin.origin,
    sire: origin.sire,
    dam: origin.dam,
    damsire: origin.damsire,

    weight:
      numberValue(
        cellText($, weightCell)
      ),

    jockey,
    jockeyId:
      queryId(
        jockeyLink.href,
        ['QueryParameter_JokeyId']
      ),

    apprentice:
      /\bAP\b/i.test(jockey) ||
      /Apranti/i.test(
        cellText($, jockeyCell)
      ),

    owner,
    ownerId:
      queryId(
        ownerLink.href,
        ['QueryParameter_SahipId']
      ),

    trainer,
    trainerId:
      queryId(
        trainerLink.href,
        [
          'QueryParameter_AntrenorId',
          'QueryParameter_TrainerId'
        ]
      ),

    st:
      one(
        cellText($, stCell)
          .replace(/Tercihli\s*Start/gi, '')
      ),

    hp:
      integerValue(
        cellText($, hpCell)
      ),

    last6:
      cellText($, last6Cell),

    kgs:
      integerValue(
        cellText($, kgsCell)
      ),

    s20:
      numberValue(
        cellText($, s20Cell)
      ),

    best:
      cellText($, bestCell),

    odds:
      numberValue(
        cellText($, oddsCell)
      ),

    agf: agf.value,
    agfRank: agf.rank
  };
}

function getProgramTables($) {
  /*
    1. tercih:
      Python ProgramCollector ile aynı seçim.
  */
  let tables =
    $('table.GunlukYarisProgrami').toArray();

  if (tables.length) {
    return {
      mode: 'table.GunlukYarisProgrami',
      tables
    };
  }

  /*
    2. tercih:
      TJK bazı günlerde sınıfı üst div'e taşıyabiliyor.
  */
  tables =
    $('[class*="GunlukYarisProgrami"] table')
      .filter((_, table) =>
        $(table).find(
          'td.GunlukYarisProgrami-AtAdi,' +
          'td[class*="GunlukYarisProgrami-AtAdi"]'
        ).length > 0
      )
      .toArray();

  if (tables.length) {
    return {
      mode: 'GunlukYarisProgrami container',
      tables
    };
  }

  /*
    3. güvenlik ağı:
      at adı hücresi doğrudan.
  */
  const set = new Set();

  $(
    'td.GunlukYarisProgrami-AtAdi,' +
    'td[class*="GunlukYarisProgrami-AtAdi"]'
  ).each((_, td) => {
    const table = $(td).closest('table').get(0);
    if (table) set.add(table);
  });

  if (set.size) {
    return {
      mode: 'horse-cell fallback',
      tables: [...set]
    };
  }

  /*
    4. son güvenlik ağı:
      tablo metninde "At İsmi" + "Jokey" aranır.
  */
  tables =
    $('table')
      .filter((_, table) => {
        const t = key($(table).text());
        return (
          t.includes('at ismi') &&
          t.includes('jokey') &&
          t.includes('siklet')
        );
      })
      .toArray();

  return {
    mode: 'header-text fallback',
    tables
  };
}

function findBetStarts($, table) {
  const bets = [];

  /*
    Tablodan sonraki ilk koşu başlığına kadar başlıkları tara.
  */
  let node = table.next;
  let guard = 0;

  while (node && guard < 500) {
    guard += 1;

    if (
      isHeadingNode(node) &&
      parseRaceTitle($(node).text())
    ) {
      break;
    }

    const txt = one($(node).text());

    const m = txt.match(
      /(.+?)\s+Bu koşudan başlar/i
    );

    if (m) {
      const bet = one(m[1]);
      if (
        bet &&
        bet.length < 80 &&
        !bets.includes(bet)
      ) {
        bets.push(bet);
      }
    }

    node = node.next;
  }

  return bets;
}

function parseCityProgram(html, city) {
  const $ = cheerio.load(html, {
    decodeEntities: false
  });

  // Script/style at tabloları etkilemiyor; yalnız metin gürültüsünü azalt.
  $('script,style,noscript').remove();

  const found =
    getProgramTables($);

  const races = [];

  for (const table of found.tables) {
    const ctx =
      closestRaceContext($, table);

    if (!ctx?.no) {
      continue;
    }

    const condition =
      splitRaceCondition(
        ctx.conditionText
      );

    const labels =
      tableHeaderLabels($, table);

    const horses = [];

    $(table).find('tbody tr, tr').each((_, row) => {
      if (
        $(row).find('th').length &&
        !$(row).find(
          'td.GunlukYarisProgrami-AtAdi,' +
          'td[class*="GunlukYarisProgrami-AtAdi"]'
        ).length
      ) {
        return;
      }

      const horse =
        horseFromRow(
          $,
          row,
          labels
        );

      if (horse) {
        horses.push(horse);
      }
    });

    if (!horses.length) {
      continue;
    }

    const uniqueHorses =
      [...new Map(
        horses.map(h => [
          `${h.no}|${h.id || h.name}`,
          h
        ])
      ).values()]
      .sort((a, b) => a.no - b.no);

    races.push({
      no: ctx.no,
      time: ctx.time,

      class: condition.class,
      ageGroup: condition.ageGroup,
      condition: condition.condition,

      yaradi1: condition.yaradi1,
      yaradi2: condition.yaradi2,
      yaradi3: condition.yaradi3,

      distance: condition.distance,
      track: condition.track,

      betStarts:
        findBetStarts($, table),

      horses: uniqueHorses,

      source:
        'TJK Günlük Yarış Programı',

      sourceUrl: city.url,

      parserAudit: {
        tableSelector: found.mode,
        sameTableRaceBinding: true,
        raceHeading:
          `${ctx.no}. Koşu ${ctx.time}`.trim(),
        conditionHeading:
          ctx.conditionText,
        horseCount:
          uniqueHorses.length
      }
    });
  }

  /*
    Aynı koşu ikinci kez görünürse en çok atı olanı tut.
  */
  const byNo = new Map();

  for (const race of races) {
    const old = byNo.get(race.no);

    if (
      !old ||
      race.horses.length >
        old.horses.length
    ) {
      byNo.set(race.no, race);
    }
  }

  return {
    selectorMode: found.mode,
    rawTableCount: found.tables.length,
    races:
      [...byNo.values()]
        .sort((a, b) => a.no - b.no)
  };
}

async function fetchText(url) {
  const r = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    redirect: 'follow',
    headers: HEADERS
  });

  if (!r.ok) {
    throw new Error(
      `TJK HTTP ${r.status}`
    );
  }

  const text = await r.text();

  if (!text || text.length < 500) {
    throw new Error(
      'TJK HTML boş veya eksik.'
    );
  }

  return text;
}

function extractCities(rootHtml, trDate) {
  const $ = cheerio.load(rootHtml);
  const map = new Map();

  $('a[href]').each((_, a) => {
    const href =
      String($(a).attr('href') || '');

    if (
      !/GunlukYarisProgrami/i.test(href)
    ) {
      return;
    }

    let u;

    try {
      u = new URL(
        absoluteUrl(href)
      );
    } catch {
      return;
    }

    const id =
      u.searchParams.get('SehirId');

    const name =
      one(
        u.searchParams.get('SehirAdi') ||
        $(a).text()
      );

    if (!id || !name) return;

    if (
      String(id) === '17' ||
      key(name) === 'karma'
    ) {
      return;
    }

    const city = {
      id: String(id),
      name,
      url:
        `${CITY_URL}` +
        `?Era=today` +
        `&QueryParameter_Tarih=${encodeURIComponent(trDate)}` +
        `&SehirAdi=${encodeURIComponent(name)}` +
        `&SehirId=${encodeURIComponent(id)}`
    };

    map.set(
      `${city.id}|${key(city.name)}`,
      city
    );
  });

  return [...map.values()];
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        out[i] = await fn(items[i], i);
      } catch (e) {
        out[i] = {
          city: items[i],
          error:
            e?.message ||
            String(e)
        };
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length:
          Math.min(
            Math.max(1, limit),
            items.length
          )
      },
      worker
    )
  );

  return out;
}

export default async function handler(req, res) {
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Cache-Control',
    'no-store, max-age=0'
  );

  if (
    req.method &&
    req.method !== 'GET'
  ) {
    return res.status(405).json({
      ok: false,
      version: VERSION,
      error: 'Yalnız GET desteklenir.'
    });
  }

  const date =
    one(req.query?.date || '');

  const trDate =
    isoToTrDate(date);

  if (!trDate) {
    return res.status(400).json({
      ok: false,
      version: VERSION,
      error:
        'date YYYY-MM-DD biçiminde olmalıdır.'
    });
  }

  const rootUrl =
    `${ROOT_URL}` +
    `?QueryParameter_Tarih=${encodeURIComponent(trDate)}`;

  try {
    const rootHtml =
      await fetchText(rootUrl);

    const cities =
      extractCities(
        rootHtml,
        trDate
      );

    if (!cities.length) {
      throw new Error(
        'TJK ana sayfasında şehir bulunamadı.'
      );
    }

    const results =
      await mapLimit(
        cities,
        3,
        async city => {
          const html =
            await fetchText(city.url);

          const parsed =
            parseCityProgram(
              html,
              city
            );

          return {
            city,
            ...parsed
          };
        }
      );

    const outputCities = [];
    const racesByCity = {};
    const errors = [];
    const parserAudit = [];

    for (const result of results) {
      if (!result) continue;

      if (result.error) {
        errors.push({
          city: result.city?.name || '',
          cityId: result.city?.id || '',
          error: result.error
        });
        continue;
      }

      parserAudit.push({
        city: result.city.name,
        cityId: result.city.id,
        tableSelector:
          result.selectorMode,
        rawTableCount:
          result.rawTableCount,
        parsedRaceCount:
          result.races.length
      });

      if (!result.races.length) {
        errors.push({
          city: result.city.name,
          cityId: result.city.id,
          error:
            `Program tablosu ayrıştırılamadı. ` +
            `selector=${result.selectorMode}, ` +
            `tableCount=${result.rawTableCount}`
        });
        continue;
      }

      outputCities.push({
        id: result.city.id,
        name: result.city.name
      });

      racesByCity[
        String(result.city.id)
      ] = result.races;
    }

    const allRaces =
      Object.values(racesByCity)
        .flat();

    const horseCount =
      allRaces.reduce(
        (sum, race) =>
          sum +
          (
            Array.isArray(race.horses)
              ? race.horses.length
              : 0
          ),
        0
      );

    return res.status(200).json({
      ok: true,

      version: VERSION,
      parserVersion: VERSION,

      parser: {
        version:
          'desktop-programcollector-port-v4.2',
        source: 'TJK',
        date
      },

      date,

      cityCount:
        outputCities.length,

      raceCount:
        allRaces.length,

      horseCount,

      cities:
        outputCities,

      racesByCity,

      // Önceki frontend ile uyum.
      programs:
        racesByCity,

      audit: {
        tableRule:
          'table.GunlukYarisProgrami',
        contextRule:
          'TABLE_FIND_PREVIOUS_H3_PYTHON_PROGRAMCOLLECTOR',
        horseNameRule:
          'td.GunlukYarisProgrami-AtAdi a',
        raceFieldRule:
          'yaradi1_yaradi2_yaradi3_mesafe_pist',
        parserAudit,
        errors
      },

      source:
        'TJK Günlük Yarış Programı',

      sourceUrl:
        rootUrl
    });
  } catch (e) {
    return res.status(502).json({
      ok: false,
      version: VERSION,
      parserVersion: VERSION,
      date,
      error:
        e?.message ||
        'TJK günlük programı alınamadı.'
    });
  }
}
