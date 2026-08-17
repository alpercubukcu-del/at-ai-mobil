import * as cheerio from 'cheerio';

const VERSION = 'TJK-PARSER-V4';
const TJK_ROOT =
  'https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisProgrami';
const TJK_CITY =
  'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/139 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language':
    'tr-TR,tr;q=0.9,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

function cleanText(value = '') {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function oneLine(value = '') {
  return cleanText(value)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value = '') {
  return oneLine(value)
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

function isoToTrDate(iso = '') {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function absoluteUrl(href = '') {
  const h = String(href || '').trim();
  if (!h) return '';
  try {
    return new URL(h, 'https://www.tjk.org').toString();
  } catch {
    return h;
  }
}

function extractQueryNumber(href = '', names = []) {
  const decoded = String(href || '').replace(/&amp;/gi, '&');
  for (const name of names) {
    const m = decoded.match(
      new RegExp(`(?:[?&])${name}=(\\d+)`, 'i')
    );
    if (m) return Number(m[1]);
  }
  return null;
}

function parseNumber(value = '') {
  const t = oneLine(value);
  if (!t || /^[-–—]$/.test(t)) return null;

  const cleaned = t
    .replace(/%/g, '')
    .replace(/₺/g, '')
    .replace(/\bTL\b/gi, '')
    .replace(/\s+/g, '');

  let numeric = cleaned;

  if (numeric.includes(',') && numeric.includes('.')) {
    if (numeric.lastIndexOf(',') > numeric.lastIndexOf('.')) {
      numeric = numeric.replace(/\./g, '').replace(',', '.');
    } else {
      numeric = numeric.replace(/,/g, '');
    }
  } else if (numeric.includes(',')) {
    numeric = numeric.replace(',', '.');
  }

  const m = numeric.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function parseInteger(value = '') {
  const m = oneLine(value).match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

function canonicalTrack(value = '') {
  const v = oneLine(value).toLocaleLowerCase('tr-TR');
  if (v === 'çim') return 'Çim';
  if (v === 'kum') return 'Kum';
  if (v === 'sentetik') return 'Sentetik';
  return '';
}

function removeHiddenAndTooltip($, element) {
  const clone = $(element).clone();

  clone
    .find(
      [
        '.tooltip',
        '.tooltip-inner',
        '.popover',
        '[role="tooltip"]',
        '[data-toggle="tooltip"] .tooltip',
        '[style*="display:none"]',
        '[style*="display: none"]',
        '[style*="visibility:hidden"]',
        '[style*="visibility: hidden"]'
      ].join(',')
    )
    .remove();

  clone.find('script,style,noscript').remove();

  return clone;
}

function cleanCellText($, element) {
  if (!element) return '';
  return oneLine(
    removeHiddenAndTooltip($, element).text()
  );
}

function firstUsefulLinkText($, element, hrefHints = []) {
  if (!element) return '';

  let best = '';

  $(element)
    .find('a')
    .each((_, a) => {
      if (best) return;

      const href = String($(a).attr('href') || '');
      if (
        hrefHints.length &&
        !hrefHints.some(h =>
          href.toLocaleLowerCase('tr-TR').includes(
            h.toLocaleLowerCase('tr-TR')
          )
        )
      ) {
        return;
      }

      const clone = $(a).clone();
      clone.find('span,sup,.tooltip,.popover').remove();

      const text = oneLine(clone.text());
      if (text) best = text;
    });

  if (best) return best;

  $(element)
    .find('a')
    .each((_, a) => {
      if (best) return;
      const clone = $(a).clone();
      clone.find('span,sup,.tooltip,.popover').remove();
      const text = oneLine(clone.text());
      if (text) best = text;
    });

  return best;
}

function hrefByHints($, element, hints = []) {
  if (!element) return '';

  let found = '';
  $(element)
    .find('a[href]')
    .each((_, a) => {
      if (found) return;
      const href = String($(a).attr('href') || '');
      if (
        !hints.length ||
        hints.some(h =>
          href.toLocaleLowerCase('tr-TR').includes(
            h.toLocaleLowerCase('tr-TR')
          )
        )
      ) {
        found = href;
      }
    });

  return found;
}

function cleanupHorseName(value = '') {
  let t = oneLine(value);

  // Güvenlik ağı: link metni alınamazsa tooltip açıklamalarını kes.
  const stopPatterns = [
    /\bKGKapalı gözlük/i,
    /\bKKulaklık takılacağını/i,
    /\bDBDilinin bağlanacağını/i,
    /\bSKRing mahalinden/i,
    /\bSKGRing mahalinden/i,
    /\bGKRGöz koruyucu/i,
    /\bYPYanak peluşu/i,
    /\bAPApranti\b/i,
    /\(Satılık\)/i
  ];

  let cut = t.length;
  for (const p of stopPatterns) {
    const m = t.match(p);
    if (m && m.index < cut) cut = m.index;
  }

  t = t.slice(0, cut).trim();

  // Satış bedeli link metnine girmişse temizle.
  t = t
    .replace(/\s+t\d[\d.,]*\s*TL.*$/i, '')
    .replace(/\s+\(Satılık\).*$/i, '')
    .trim();

  return t;
}

function cleanupJockey(value = '') {
  return oneLine(value)
    .replace(/APApranti/gi, 'AP')
    .replace(/\bApranti\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanupStart(value = '') {
  const t = oneLine(value)
    .replace(/Tercihli\s*Start/gi, '')
    .trim();

  const m = t.match(/^(\d+)\s*(DS)?/i);
  if (!m) return t;
  return `${m[1]}${m[2] ? 'DS' : ''}`;
}

function tableHeaders($, table) {
  let headers = [];

  $(table)
    .find('tr')
    .each((_, tr) => {
      if (headers.length) return;
      const ths = $(tr).find('th');
      if (!ths.length) return;

      headers = ths
        .map((__, th) => normalizeKey($(th).text()))
        .get();
    });

  return headers;
}

function isHorseTable($, table) {
  const headers = tableHeaders($, table);
  const joined = ` ${headers.join(' | ')} `;

  return (
    joined.includes('at ismi') &&
    joined.includes('jokey') &&
    (
      joined.includes('siklet') ||
      joined.includes('kilo')
    )
  );
}

function fieldCell(map, ...keys) {
  for (const key of keys) {
    if (map[key]) return map[key];
  }
  return null;
}

function mapRowCells($, headers, row) {
  const tds = $(row).find('td').toArray();
  const out = {};

  headers.forEach((h, i) => {
    if (tds[i]) out[h] = tds[i];
  });

  return out;
}

function parseRaceHeader(text = '') {
  const t = oneLine(text);
  const m = t.match(
    /(\d+)\s*\.\s*Koşu(?:\s+(\d{1,2}[.:]\d{2}))?/i
  );

  if (!m) return null;

  return {
    no: Number(m[1]),
    time: m[2] ? m[2].replace('.', ':') : ''
  };
}

function nearestRaceHeading($, table) {
  const candidates = $(table)
    .prevAll('h1,h2,h3,h4,h5,h6')
    .toArray();

  for (const node of candidates) {
    const parsed = parseRaceHeader($(node).text());
    if (parsed) {
      return {
        ...parsed,
        node
      };
    }
  }

  // TJK bazen tabloyu bir kapsayıcı içine alıyor.
  let current = $(table).parent();

  for (let depth = 0; depth < 8 && current.length; depth += 1) {
    const siblings = current
      .prevAll()
      .toArray();

    for (const sibling of siblings) {
      const heading =
        $(sibling).is('h1,h2,h3,h4,h5,h6')
          ? sibling
          : $(sibling)
              .find('h1,h2,h3,h4,h5,h6')
              .last()
              .get(0);

      if (!heading) continue;

      const parsed = parseRaceHeader($(heading).text());
      if (parsed) {
        return {
          ...parsed,
          node: heading
        };
      }
    }

    current = current.parent();
  }

  // Son güvenlik ağı: DOM'da önceki başlıklardan en yakını.
  const previousHeadings = $('h1,h2,h3,h4,h5,h6')
    .filter((_, h) => {
      const pos =
        $(h).get(0)?.compareDocumentPosition?.(table);
      return Boolean(pos & 4); // DOCUMENT_POSITION_FOLLOWING
    })
    .toArray()
    .reverse();

  for (const heading of previousHeadings) {
    const parsed = parseRaceHeader($(heading).text());
    if (parsed) {
      return {
        ...parsed,
        node: heading
      };
    }
  }

  return null;
}

function collectLocalRaceText($, headingNode, table) {
  if (!headingNode) return '';

  const pieces = [];
  let node = headingNode;
  let guard = 0;

  while (node && guard < 300) {
    guard += 1;

    if (node === table) break;

    const next = nextNodeInDocument($, node);
    if (!next || next === node) break;

    node = next;

    if (node === table) break;

    if (
      $(node).is('h1,h2,h3,h4,h5,h6') &&
      parseRaceHeader($(node).text())
    ) {
      break;
    }

    if ($(node).is('table')) {
      continue;
    }

    // Metni sadece anlamlı bloklardan al; tablonun at satırlarını dahil etme.
    if (
      $(node).is(
        'h1,h2,h3,h4,h5,h6,p,div,span,strong,b,small'
      )
    ) {
      const text = oneLine($(node).clone().children().remove().end().text());
      if (text) pieces.push(text);
    }
  }

  const headingText = oneLine($(headingNode).text());

  return oneLine(
    [headingText, ...pieces]
      .filter(Boolean)
      .join(' ')
  );
}

function nextNodeInDocument($, node) {
  if (!node) return null;

  const firstChild = $(node).children().get(0);
  if (firstChild) return firstChild;

  let cursor = node;

  while (cursor) {
    const nextSibling = $(cursor).next().get(0);
    if (nextSibling) return nextSibling;
    cursor = $(cursor).parent().get(0);
  }

  return null;
}

function localRaceTextByRange($, headingNode, table) {
  // Cheerio'da DOM düğüm yürüyüşü sayfa yapısına göre değişebildiği için
  // önce HTML sırasındaki başlık -> tablo aralığını kullanıyoruz.
  const rootHtml = $.html();
  const headingHtml = $.html(headingNode);
  const tableHtml = $.html(table);

  const hPos = rootHtml.indexOf(headingHtml);
  const tPos = rootHtml.indexOf(tableHtml, Math.max(0, hPos));

  if (hPos >= 0 && tPos > hPos) {
    const fragment = rootHtml.slice(
      hPos,
      Math.min(tPos, hPos + 20000)
    );

    const $$ = cheerio.load(`<div id="race-local">${fragment}</div>`);
    $$('#race-local script,#race-local style,#race-local noscript').remove();

    const text = oneLine($$('#race-local').text());
    if (text) return text;
  }

  return collectLocalRaceText($, headingNode, table);
}

function extractAgeGroup(text = '') {
  const t = oneLine(text);

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

  for (const p of patterns) {
    const m = t.match(p);
    if (m) return oneLine(m[1]);
  }

  return '';
}

function extractDistanceTrack(text = '') {
  const t = oneLine(text);

  const patterns = [
    /(\d{3,4})\s*m?\s*(Çim|Kum|Sentetik)\b/i,
    /(\d{3,4})\s*(Çim|Kum|Sentetik)\b/i
  ];

  for (const p of patterns) {
    const m = t.match(p);
    if (m) {
      return {
        distance: Number(m[1]),
        track: canonicalTrack(m[2])
      };
    }
  }

  return {
    distance: null,
    track: ''
  };
}

function normalizeRaceClass(value = '') {
  return oneLine(value)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function findConditionSentence(text = '', raceNo = null) {
  let t = oneLine(text);

  if (raceNo) {
    t = t.replace(
      new RegExp(
        `^.*?${raceNo}\\s*\\.\\s*Koşu(?:\\s+\\d{1,2}[.:]\\d{2})?\\s*`,
        'i'
      ),
      ''
    );
  }

  // Kullanıcı sekme/menü adlarını yarış şartına katma.
  t = t
    .replace(
      /Koşu Bilgisi\s+At Karşılaştırma\s+Jokey Karşılaştırma\s+Sahip Karşılaştırma\s+Antrenör Karşılaştırma\s+Detaylı At Karşılaştırma\s+İdman Bilgileri/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  const distanceMatch = t.match(
    /(\d{3,4})\s*m?\s*(Çim|Kum|Sentetik)\b/i
  );

  if (!distanceMatch) return t.slice(0, 700);

  const end = distanceMatch.index + distanceMatch[0].length;

  // Yarış şartının önünde genelde başlık, sonrasında İkramiye gelir.
  let candidate = t.slice(0, end);

  const markers = [
    'İkramiye:',
    'Ikramiye:',
    'Yetiştirici Primi:',
    'Yetistirici Primi:',
    'At Sahibi Primi:',
    'N At İsmi'
  ];

  for (const marker of markers) {
    const idx = candidate.lastIndexOf(marker);
    if (idx >= 0) {
      candidate = candidate.slice(idx + marker.length);
    }
  }

  return oneLine(candidate);
}

function parseRaceCondition(localText = '', raceNo = null) {
  const conditionText = findConditionSentence(
    localText,
    raceNo
  );

  const ageGroup = extractAgeGroup(conditionText);
  const dt = extractDistanceTrack(conditionText);

  let raceClass = '';
  let condition = '';

  if (ageGroup) {
    const lower = conditionText.toLocaleLowerCase('tr-TR');
    const ageLower = ageGroup.toLocaleLowerCase('tr-TR');
    const ageIndex = lower.indexOf(ageLower);

    if (ageIndex >= 0) {
      raceClass = conditionText
        .slice(0, ageIndex)
        .replace(
          /^\d+\s*\.\s*Koşu(?:\s+\d{1,2}[.:]\d{2})?/i,
          ''
        )
        .trim()
        .replace(/[,\s]+$/g, '');

      const afterAge =
        conditionText.slice(ageIndex + ageGroup.length);

      const dtMatch = afterAge.match(
        /(\d{3,4})\s*m?\s*(Çim|Kum|Sentetik)\b/i
      );

      if (dtMatch && typeof dtMatch.index === 'number') {
        condition = afterAge
          .slice(0, dtMatch.index)
          .replace(/^[,\s]+|[,\s]+$/g, '')
          .trim();
      }
    }
  }

  raceClass = normalizeRaceClass(raceClass);

  // Virgüllü resmi TJK düzeni varsa en güvenilir ayrıştırma.
  // Örn: "HANDİKAP 16 /H2 , 4 ve Yukarı Araplar, 58 kg, 2100 Kum"
  const compact = conditionText
    .replace(
      /E\.?\s*İ\.?\s*D\.?\s*:.*$/i,
      ''
    )
    .trim();

  const dtRe =
    /(\d{3,4})\s*m?\s*(Çim|Kum|Sentetik)\b/i;
  const dtM = compact.match(dtRe);

  let beforeDt = compact;

  if (dtM && typeof dtM.index === 'number') {
    beforeDt = compact.slice(0, dtM.index);
  }

  const commaParts = beforeDt
    .split(',')
    .map(oneLine)
    .filter(Boolean);

  if (commaParts.length >= 2) {
    const ageIdx = commaParts.findIndex(p =>
      Boolean(extractAgeGroup(p))
    );

    if (ageIdx >= 0) {
      const classCandidate =
        commaParts
          .slice(0, ageIdx)
          .join(', ')
          .replace(
            /^\d+\s*\.\s*Koşu(?:\s+\d{1,2}[.:]\d{2})?/i,
            ''
          )
          .trim();

      if (classCandidate) {
        raceClass = normalizeRaceClass(
          classCandidate
        );
      }

      const exactAge = extractAgeGroup(
        commaParts[ageIdx]
      );

      const restAgeText = commaParts[ageIdx]
        .replace(exactAge, '')
        .replace(/^[,\s]+|[,\s]+$/g, '');

      const restParts = [
        restAgeText,
        ...commaParts.slice(ageIdx + 1)
      ].filter(Boolean);

      if (restParts.length) {
        condition = oneLine(restParts.join(', '));
      }
    }
  }

  return {
    class: raceClass,
    ageGroup,
    condition,
    yaradi1: raceClass,
    yaradi2: ageGroup,
    yaradi3: condition,
    distance: dt.distance,
    track: dt.track,
    rawCondition: conditionText
  };
}

function parseBetStarts(localText = '') {
  const t = oneLine(localText);
  const m = t.match(
    /Başlayan\s+bahisler\s*:\s*(.*?)(?=(?:N\s+At\s+İsmi|N\s+At\s+Ismi|$))/i
  );

  if (!m) return [];

  let s = oneLine(m[1]);

  s = s
    .replace(/Koşu Bilgisi.*$/i, '')
    .trim();

  return s
    .split(/[·•|,]+/)
    .map(oneLine)
    .filter(Boolean)
    .filter(x => x.length < 60);
}

function parseHorseAge(value = '') {
  const t = oneLine(value);
  const m = t.match(
    /(\d+)\s*y\s*([a-zçğıöşü])?\s*([a-zçğıöşü])?/i
  );

  return {
    raw: t,
    years: m ? Number(m[1]) : null,
    color: m?.[2] || '',
    sex: m?.[3] || ''
  };
}

function splitOrigin(value = '') {
  const t = oneLine(value);
  if (!t) {
    return {
      origin: '',
      sire: '',
      dam: '',
      damsire: ''
    };
  }

  let left = t;
  let damsire = '';

  if (t.includes('/')) {
    const ix = t.lastIndexOf('/');
    left = t.slice(0, ix);
    damsire = oneLine(t.slice(ix + 1));
  }

  let sire = '';
  let dam = '';

  const hyphen = left.indexOf('-');

  if (hyphen >= 0) {
    sire = oneLine(left.slice(0, hyphen));
    dam = oneLine(left.slice(hyphen + 1));
  } else {
    sire = oneLine(left);
  }

  return {
    origin: t,
    sire,
    dam,
    damsire
  };
}

function parseAgf(value = '') {
  const t = oneLine(value);
  const pct = t.match(/%?\s*(\d+(?:[.,]\d+)?)/);
  const rank = t.match(/\((\d+)\)/);

  return {
    value: pct
      ? Number(pct[1].replace(',', '.'))
      : null,
    rank: rank ? Number(rank[1]) : null
  };
}

function findHorseCellByClass($, row) {
  const selectors = [
    'td.GunlukYarisProgrami-AtAdi',
    'td[class*="GunlukYarisProgrami-AtAdi"]',
    'td[class*="AtAdi"]'
  ];

  for (const s of selectors) {
    const found = $(row).find(s).get(0);
    if (found) return found;
  }

  return null;
}

function classCell($, row, token) {
  let found = null;

  $(row)
    .find('td')
    .each((_, td) => {
      if (found) return;
      const cls = String($(td).attr('class') || '');
      if (cls.includes(token)) found = td;
    });

  return found;
}

function parseHorse($, headers, row) {
  const cells = mapRowCells($, headers, row);

  const noCell =
    fieldCell(cells, 'n', 'no', 'at no') ||
    $(row).find('td').get(0);

  const horseCell =
    findHorseCellByClass($, row) ||
    fieldCell(cells, 'at ismi', 'at adi');

  const jockeyCell =
    classCell($, row, 'JokeAdi') ||
    fieldCell(cells, 'jokey');

  const ownerCell =
    classCell($, row, 'SahipAdi') ||
    fieldCell(cells, 'sahip');

  const trainerCell =
    classCell($, row, 'AntronorAdi') ||
    classCell($, row, 'AntrenorAdi') ||
    fieldCell(cells, 'antrenor');

  const horseNo = parseInteger(
    cleanCellText($, noCell)
  );

  if (!horseCell || !horseNo) return null;

  const horseHref = hrefByHints(
    $,
    horseCell,
    ['QueryParameter_AtId=', 'AtKosuBilgileri']
  );

  let horseName = firstUsefulLinkText(
    $,
    horseCell,
    ['QueryParameter_AtId=', 'AtKosuBilgileri']
  );

  if (!horseName) {
    horseName = cleanCellText($, horseCell);
  }

  horseName = cleanupHorseName(horseName);

  if (!horseName) return null;

  const horseId = extractQueryNumber(
    horseHref,
    [
      'QueryParameter_AtId',
      'AtId'
    ]
  );

  const ageCell =
    fieldCell(cells, 'yas');

  const originCell =
    fieldCell(
      cells,
      'orijin baba anne',
      'orijin'
    );

  const weightCell =
    fieldCell(cells, 'siklet', 'kilo');

  const stCell =
    fieldCell(cells, 'st', 'kulvar');

  const hpCell =
    fieldCell(cells, 'hp');

  const last6Cell =
    fieldCell(
      cells,
      'son 6 y',
      'son 6',
      'son6'
    );

  const kgsCell =
    fieldCell(cells, 'kgs');

  const s20Cell =
    fieldCell(cells, 's20');

  const bestCell =
    fieldCell(
      cells,
      'en iyi d',
      'en iyi derece'
    );

  const oddsCell =
    fieldCell(cells, 'gny', 'ganyan');

  const agfCell =
    fieldCell(cells, 'agf');

  const age = parseHorseAge(
    cleanCellText($, ageCell)
  );

  const origin = splitOrigin(
    cleanCellText($, originCell)
  );

  let jockey =
    firstUsefulLinkText($, jockeyCell) ||
    cleanCellText($, jockeyCell);

  jockey = cleanupJockey(jockey);

  const owner =
    firstUsefulLinkText($, ownerCell) ||
    cleanCellText($, ownerCell);

  const trainer =
    firstUsefulLinkText($, trainerCell) ||
    cleanCellText($, trainerCell);

  const jockeyHref = hrefByHints(
    $,
    jockeyCell,
    ['QueryParameter_JokeyId=']
  );

  const ownerHref = hrefByHints(
    $,
    ownerCell,
    ['QueryParameter_SahipId=']
  );

  const trainerHref = hrefByHints(
    $,
    trainerCell,
    [
      'QueryParameter_AntrenorId=',
      'QueryParameter_TrainerId='
    ]
  );

  const agf = parseAgf(
    cleanCellText($, agfCell)
  );

  const rawHorseCell = oneLine(
    $(horseCell).text()
  );

  const tags = [];
  for (const code of [
    'SKG',
    'SGKR',
    'GKR',
    'KG',
    'DB',
    'SK',
    'K',
    'BB',
    'ÖG',
    'TGK',
    'MBH',
    'YP'
  ]) {
    const re = new RegExp(
      `(?:^|\\s|>)${code}(?:\\s|<|$)`,
      'i'
    );

    if (re.test(rawHorseCell)) {
      tags.push(code);
    }
  }

  return {
    no: horseNo,
    id: horseId,
    name: horseName,

    age: age.raw,
    ageYears: age.years,
    color: age.color,
    sex: age.sex,

    origin: origin.origin,
    sire: origin.sire,
    dam: origin.dam,
    damsire: origin.damsire,

    tags: [...new Set(tags)].join(' '),

    weight: parseNumber(
      cleanCellText($, weightCell)
    ),

    jockey,
    jockeyId: extractQueryNumber(
      jockeyHref,
      ['QueryParameter_JokeyId']
    ),
    apprentice:
      /\bAP\b/i.test(jockey) ||
      /Apranti/i.test(
        cleanCellText($, jockeyCell)
      ),

    owner,
    ownerId: extractQueryNumber(
      ownerHref,
      ['QueryParameter_SahipId']
    ),

    trainer,
    trainerId: extractQueryNumber(
      trainerHref,
      [
        'QueryParameter_AntrenorId',
        'QueryParameter_TrainerId'
      ]
    ),

    st: cleanupStart(
      cleanCellText($, stCell)
    ),

    hp: parseInteger(
      cleanCellText($, hpCell)
    ),

    last6: cleanCellText($, last6Cell),

    kgs: parseInteger(
      cleanCellText($, kgsCell)
    ),

    s20: parseNumber(
      cleanCellText($, s20Cell)
    ),

    best: cleanCellText($, bestCell),

    odds: parseNumber(
      cleanCellText($, oddsCell)
    ),

    agf: agf.value,
    agfRank: agf.rank
  };
}

function findRaceCode($, table) {
  let code = null;

  $(table)
    .find('a[href]')
    .each((_, a) => {
      if (code) return;

      const href = String(
        $(a).attr('href') || ''
      ).replace(/&amp;/gi, '&');

      const m = href.match(
        /(?:[?&])KosuKodu=(\d+)/i
      );

      if (m) code = Number(m[1]);
    });

  return code;
}

function qualityScore(race) {
  return (
    (race.class ? 10 : 0) +
    (race.ageGroup ? 10 : 0) +
    (race.distance ? 8 : 0) +
    (race.track ? 8 : 0) +
    Math.min(
      Array.isArray(race.horses)
        ? race.horses.length
        : 0,
      25
    )
  );
}

function parseCityProgram(html, city) {
  const $ = cheerio.load(html);

  $('script,style,noscript').remove();

  const tables = $('table')
    .filter((_, table) =>
      isHorseTable($, table)
    )
    .toArray();

  const racesByNo = new Map();

  for (const table of tables) {
    const heading = nearestRaceHeading(
      $,
      table
    );

    if (!heading?.no) {
      continue;
    }

    const localText = localRaceTextByRange(
      $,
      heading.node,
      table
    );

    const condition =
      parseRaceCondition(
        localText,
        heading.no
      );

    const headers = tableHeaders(
      $,
      table
    );

    const horses = [];

    $(table)
      .find('tr')
      .each((_, row) => {
        if ($(row).find('th').length) {
          return;
        }

        const horse =
          parseHorse(
            $,
            headers,
            row
          );

        if (horse) horses.push(horse);
      });

    if (!horses.length) {
      continue;
    }

    const race = {
      no: heading.no,
      time: heading.time || '',
      raceCode: findRaceCode($, table),

      class: condition.class,
      ageGroup: condition.ageGroup,
      condition: condition.condition,

      // Eski masaüstü veri yapısı ile bire bir uyumluluk.
      yaradi1: condition.yaradi1,
      yaradi2: condition.yaradi2,
      yaradi3: condition.yaradi3,

      distance: condition.distance,
      track: condition.track,

      betStarts: parseBetStarts(localText),

      horses,

      source: 'TJK Günlük Yarış Programı',
      sourceUrl: city.url,

      // Doğrulama sırasında yararlı; UI kullanmak zorunda değil.
      parserAudit: {
        horseTableMatched: true,
        nearestRaceHeading: true,
        conditionBoundToSameTable: true,
        rawCondition: condition.rawCondition
      }
    };

    const existing =
      racesByNo.get(race.no);

    if (
      !existing ||
      qualityScore(race) >
        qualityScore(existing)
    ) {
      racesByNo.set(
        race.no,
        race
      );
    }
  }

  return [...racesByNo.values()]
    .sort((a, b) => a.no - b.no);
}

async function fetchText(url) {
  const response = await fetch(
    url,
    {
      method: 'GET',
      cache: 'no-store',
      headers: REQUEST_HEADERS
    }
  );

  if (!response.ok) {
    throw new Error(
      `TJK HTTP ${response.status}: ${url}`
    );
  }

  const html = await response.text();

  if (!html || html.length < 500) {
    throw new Error(
      `TJK HTML boş veya eksik: ${url}`
    );
  }

  return html;
}

function cityFromLink($, a, trDate) {
  const href = String(
    $(a).attr('href') || ''
  );

  if (
    !/GunlukYarisProgrami/i.test(href)
  ) {
    return null;
  }

  const absolute =
    absoluteUrl(href);

  let parsed;

  try {
    parsed = new URL(absolute);
  } catch {
    return null;
  }

  const id =
    parsed.searchParams.get('SehirId');

  const name =
    oneLine(
      parsed.searchParams.get('SehirAdi') ||
      $(a).text()
    );

  if (!id || !name) {
    return null;
  }

  // TJK'nın "Karma" sekmesi gerçek bir yarış hipodromu değildir.
  // Aynı koşuları tekrar/mix ettiği için programdan çıkarılır.
  if (
    String(id) === '17' ||
    normalizeKey(name) === 'karma'
  ) {
    return null;
  }

  const url =
    `${TJK_CITY}` +
    `?Era=today` +
    `&QueryParameter_Tarih=${encodeURIComponent(trDate)}` +
    `&SehirAdi=${encodeURIComponent(name)}` +
    `&SehirId=${encodeURIComponent(id)}`;

  return {
    id: String(id),
    name,
    url
  };
}

function extractCities(rootHtml, trDate) {
  const $ = cheerio.load(rootHtml);
  const map = new Map();

  $('a[href]').each((_, a) => {
    const city = cityFromLink(
      $,
      a,
      trDate
    );

    if (!city) return;

    const key =
      `${city.id}|${normalizeKey(city.name)}`;

    if (!map.has(key)) {
      map.set(key, city);
    }
  });

  return [...map.values()];
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) return;

      try {
        out[index] = await worker(
          items[index],
          index
        );
      } catch (error) {
        out[index] = {
          item: items[index],
          error:
            error?.message ||
            String(error)
        };
      }
    }
  }

  const workers =
    Array.from(
      {
        length:
          Math.min(
            limit,
            items.length
          )
      },
      () => run()
    );

  await Promise.all(workers);
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
      parserVersion: VERSION,
      error: 'Yalnız GET desteklenir.'
    });
  }

  const date = oneLine(
    req.query?.date || ''
  );

  const trDate =
    isoToTrDate(date);

  if (!trDate) {
    return res.status(400).json({
      ok: false,
      parserVersion: VERSION,
      error:
        'date parametresi YYYY-MM-DD biçiminde olmalıdır.'
    });
  }

  const rootUrl =
    `${TJK_ROOT}` +
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
        'TJK günlük programında şehir bulunamadı.'
      );
    }

    const results =
      await mapLimit(
        cities,
        3,
        async city => {
          const html =
            await fetchText(city.url);

          const races =
            parseCityProgram(
              html,
              city
            );

          return {
            city,
            races
          };
        }
      );

    const cleanCities = [];
    const racesByCity = {};
    const errors = [];

    for (const result of results) {
      if (!result) continue;

      if (result.error) {
        errors.push({
          city:
            result.item?.name || '',
          cityId:
            result.item?.id || '',
          error: result.error
        });
        continue;
      }

      const city = result.city;
      const races =
        Array.isArray(result.races)
          ? result.races
          : [];

      if (!races.length) {
        errors.push({
          city: city.name,
          cityId: city.id,
          error:
            'At program tablosu bulunamadı.'
        });
        continue;
      }

      cleanCities.push({
        id: city.id,
        name: city.name
      });

      racesByCity[
        String(city.id)
      ] = races;
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
              Array.isArray(race.horses)
                ? race.horses.length
                : 0
            ),
          0
        );

    return res.status(200).json({
      ok: true,
      parserVersion: VERSION,
      date,

      cityCount:
        cleanCities.length,

      raceCount,
      horseCount,

      cities:
        cleanCities,

      racesByCity,

      // Eski frontend sürümleri farklı anahtarları arıyorsa uyumluluk.
      programs:
        racesByCity,

      audit: {
        rule:
          'HER_AT_TABLOSU_EN_YAKIN_ONCEKI_KOSU_BASLIGINA_BAGLANIR',
        horseNameRule:
          'AT_ADI_TJK_AT_LINK_METNINDEN_OKUNUR',
        ageGroupRule:
          'YARADI2_AGE_GROUP_AYRI_ALAN',
        excludedPseudoCity:
          'Karma',
        failedCityCount:
          errors.length,
        errors
      },

      source:
        'TJK Günlük Yarış Programı',

      sourceUrl:
        rootUrl
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      parserVersion: VERSION,
      date,
      error:
        error?.message ||
        'TJK günlük programı alınamadı.'
    });
  }
}
