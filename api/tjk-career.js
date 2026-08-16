import * as cheerio from 'cheerio';

const VERSION = 'CAREER-ROADMAP-V8';

const BASE_URL =
  'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri';

const PAGE_SIZE = 50;

const TIMEOUT_MS = 20000;
const MAX_TRY = 4;
const MAX_PAGE_TRY = 6;

const REQUEST_DELAY_MS = 120;

/* =========================================================
   TEMEL
========================================================= */

function clean(value = '') {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTurkish(value = '') {
  return clean(value)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

function parseNumber(value) {
  const text = clean(value)
    .replace(',', '.');

  const match =
    text.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const n = Number(match[0]);

  return Number.isFinite(n)
    ? n
    : null;
}

function parseIntValue(value) {
  const n = parseNumber(value);

  return Number.isFinite(n)
    ? Math.trunc(n)
    : null;
}

/* =========================================================
   TARİH

   22.07.2026 -> 2026-07-22
========================================================= */

function parseDate(value = '') {
  const text = clean(value);

  let m = text.match(
    /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/
  );

  if (m) {
    return (
      `${m[3]}-` +
      `${String(m[2]).padStart(2, '0')}-` +
      `${String(m[1]).padStart(2, '0')}`
    );
  }

  m = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (m) {
    return text;
  }

  return null;
}

function isoToDisplay(value = '') {
  const m = clean(value).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!m) {
    return clean(value);
  }

  return `${m[3]}.${m[2]}.${m[1]}`;
}

/* =========================================================
   HEADER NORMALIZE

   26A mantığı.
========================================================= */

function normalizeHeader(value = '') {
  const text = normalizeTurkish(value)
    .replace(/[^A-Z0-9]+/g, '');

  const aliases = {
    TARIH: 'tarih',
    SEHIR: 'sehir',

    MSF: 'mesafe',
    MESAFE: 'mesafe',

    PIST: 'pist_raw',

    S: 'sira',
    SIRA: 'sira',

    DERECE: 'derece',

    SIKLET: 'siklet',

    TAKI: 'taki',

    JOKEY: 'jokey',

    ST: 'st',

    GNY: 'ganyan',

    GRUP: 'grup',

    KNOKADI: 'kosu_no_adi',
    KNOADI: 'kosu_no_adi',

    KCINS: 'kcins',

    ANT: 'antrenor',
    ANTRENOR: 'antrenor',

    SAHIP: 'sahip',

    HP: 'hp',

    IKRAMIYE: 'ikramiye',

    S20: 's20'
  };

  return (
    aliases[text] ||
    text.toLowerCase()
  );
}

/* =========================================================
   PİST
========================================================= */

function splitTrack(raw = '') {
  const text = clean(raw);
  const normalized =
    normalizeTurkish(text);

  let surface = '';

  if (
    normalized.startsWith('C') ||
    normalized.includes('CIM')
  ) {
    surface = 'Çim';
  } else if (
    normalized.startsWith('K') ||
    normalized.includes('KUM')
  ) {
    surface = 'Kum';
  } else if (
    normalized.startsWith('S') ||
    normalized.includes('SENTETIK')
  ) {
    surface = 'Sentetik';
  }

  let condition = '';

  if (text.includes(':')) {
    condition =
      clean(
        text.split(':', 2)[1]
      );
  }

  return {
    surface,
    condition
  };
}

/* =========================================================
   YAŞ GRUBU
========================================================= */

function normalizeAgeGroup(raw = '') {
  const value =
    clean(raw)
      .toLocaleUpperCase('tr-TR')
      .replace(/\s+/g, '');

  const map = {
    '2İ': '2 Yaşlı İngilizler',
    '2I': '2 Yaşlı İngilizler',

    '3İ': '3 Yaşlı İngilizler',
    '3I': '3 Yaşlı İngilizler',

    '3+İ': '3 ve Yukarı İngilizler',
    '3+I': '3 ve Yukarı İngilizler',

    '4İ': '4 Yaşlı İngilizler',
    '4I': '4 Yaşlı İngilizler',

    '4+İ': '4 ve Yukarı İngilizler',
    '4+I': '4 ve Yukarı İngilizler',

    '2A': '2 Yaşlı Araplar',
    '3A': '3 Yaşlı Araplar',
    '4A': '4 Yaşlı Araplar',

    '4+A': '4 ve Yukarı Araplar',
    '5+A': '5 ve Yukarı Araplar'
  };

  return (
    map[value] ||
    clean(raw)
  );
}

/* =========================================================
   SINIF
========================================================= */

function normalizeRaceClass(value = '') {
  return clean(value)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

/* =========================================================
   COOKIE / SESSION

   requests.Session karşılığı.

   Node fetch cookie'yi otomatik
   devam ettirmediği için manuel
   cookie jar kullanıyoruz.
========================================================= */

function createSession() {
  return {
    cookie: ''
  };
}

function getSetCookieHeaders(response) {
  if (
    response.headers &&
    typeof response.headers.getSetCookie === 'function'
  ) {
    return response.headers.getSetCookie();
  }

  const raw =
    response.headers.get('set-cookie');

  return raw
    ? [raw]
    : [];
}

function updateCookieJar(
  session,
  response
) {
  const cookies =
    getSetCookieHeaders(response);

  if (!cookies.length) {
    return;
  }

  const jar = {};

  if (session.cookie) {
    for (
      const pair of session.cookie.split(';')
    ) {
      const ix =
        pair.indexOf('=');

      if (ix < 1) {
        continue;
      }

      const key =
        clean(
          pair.slice(0, ix)
        );

      const value =
        clean(
          pair.slice(ix + 1)
        );

      if (key) {
        jar[key] = value;
      }
    }
  }

  for (const header of cookies) {
    /*
      Bir Set-Cookie içindeki
      ilk key=value yeterli.
    */

    const first =
      clean(
        String(header)
          .split(';')[0]
      );

    const ix =
      first.indexOf('=');

    if (ix < 1) {
      continue;
    }

    const key =
      clean(
        first.slice(0, ix)
      );

    const value =
      clean(
        first.slice(ix + 1)
      );

    if (key) {
      jar[key] = value;
    }
  }

  session.cookie =
    Object.entries(jar)
      .map(
        ([k, v]) =>
          `${k}=${v}`
      )
      .join('; ');
}

/* =========================================================
   FETCH TIMEOUT
========================================================= */

async function fetchWithTimeout(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      TIMEOUT_MS
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   TJK SAYFA İNDİR

   26A:
   İlk:
   ?1=1&Era=today&QueryParameter_AtId=

   Devam:
   + PageNumber
   + Sort=Tarih Desc
   + _v435
   + XMLHttpRequest
========================================================= */

async function downloadHorsePage(
  session,
  horseId,
  pageNumber = null
) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_TRY;
    attempt++
  ) {
    try {
      const params =
        new URLSearchParams();

      params.set(
        '1',
        '1'
      );

      params.set(
        'Era',
        'today'
      );

      params.set(
        'QueryParameter_AtId',
        String(horseId)
      );

      if (
        pageNumber !== null
      ) {
        params.set(
          'PageNumber',
          String(pageNumber)
        );

        params.set(
          'Sort',
          'Tarih Desc'
        );

        /*
          26A cache kırıcı.
        */

        params.set(
          '_v435',
          `${Date.now()}-${pageNumber}-${attempt}`
        );
      }

      const url =
        `${BASE_URL}?${params.toString()}`;

      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/150.0 Safari/537.36',

        'Accept-Language':
          'tr-TR,tr;q=0.9,en;q=0.6',

        'Referer':
          'https://www.tjk.org/',

        'Cache-Control':
          'no-cache',

        'Pragma':
          'no-cache',

        Accept:
          'text/html, */*; q=0.01'
      };

      if (session.cookie) {
        headers.Cookie =
          session.cookie;
      }

      if (
        pageNumber !== null
      ) {
        headers[
          'X-Requested-With'
        ] =
          'XMLHttpRequest';

        headers.Referer =
          `${BASE_URL}` +
          `?1=1` +
          `&Era=today` +
          `&QueryParameter_AtId=${encodeURIComponent(horseId)}`;
      }

      const response =
        await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers,
            redirect: 'follow'
          }
        );

      updateCookieJar(
        session,
        response
      );

      if (!response.ok) {
        throw new Error(
          `TJK HTTP ${response.status}`
        );
      }

      const html =
        await response.text();

      if (!html) {
        throw new Error(
          'TJK boş cevap döndürdü.'
        );
      }

      /*
        26A kontrolünün Node karşılığı.
      */

      if (
        !response.url.includes(
          'AtKosuBilgileri'
        ) &&
        !html.includes('Tarih')
      ) {
        throw new Error(
          'Beklenen at geçmişi sayfası gelmedi.'
        );
      }

      return {
        html,
        url,
        finalUrl:
          response.url
      };

    } catch (e) {
      lastError = e;

      if (
        attempt <
        MAX_TRY
      ) {
        await sleep(
          attempt * 500
        );
      }
    }
  }

  throw new Error(
    `At sayfası indirilemedi: ${
      lastError?.message ||
      lastError
    }`
  );
}

/* =========================================================
   TARİHÇE TABLOSU BUL

   26A required:
   tarih
   sehir
   mesafe
   pist_raw
   sira
   derece
========================================================= */

function findHistoryTable($) {
  let found = null;

  $('table').each(
    (_, table) => {
      if (found) {
        return;
      }

      const headers = [];

      $(table)
        .find('th')
        .each(
          (__, th) => {
            headers.push(
              normalizeHeader(
                $(th).text()
              )
            );
          }
        );

      const required = [
        'tarih',
        'sehir',
        'mesafe',
        'pist_raw',
        'sira',
        'derece'
      ];

      const ok =
        required.every(
          x =>
            headers.includes(x)
        );

      if (ok) {
        found = {
          table,
          headers
        };
      }
    }
  );

  return found;
}

function extractHistoryHeaders(
  html
) {
  const $ =
    cheerio.load(html);

  const found =
    findHistoryTable($);

  return found
    ? found.headers
    : [];
}

/* =========================================================
   AT ADI
========================================================= */

function extractHorseName($) {
  const selectors = [
    '.horse-name',
    'h2',
    'h1',
    'title'
  ];

  for (
    const selector of selectors
  ) {
    const node =
      $(selector).first();

    if (
      node &&
      node.length
    ) {
      const text =
        clean(
          node.text()
        );

      if (text) {
        return text;
      }
    }
  }

  return '';
}

/* =========================================================
   META

   Kariyer toplamı:
   TOPLAM | K. | 1'incilik ...

   Ayrıca:
   Toplam X sonuçtan Y tanesi gösteriliyor
========================================================= */

function extractHistoryMetadata(
  html
) {
  const $ =
    cheerio.load(html);

  let careerTotal = null;

  const statisticYears =
    new Set();

  $('table').each(
    (_, table) => {
      const tableText =
        normalizeTurkish(
          $(table).text()
        );

      /*
        Özet istatistik tablosu
        olduğundan emin ol.
      */

      if (
        !tableText.includes(
          'INCILIK'
        ) ||
        !tableText.includes(
          'KAZANC'
        )
      ) {
        return;
      }

      $(table)
        .find('tr')
        .each(
          (__, tr) => {
            const cells =
              $(tr)
                .find('th,td')
                .map(
                  (___, cell) =>
                    clean(
                      $(cell).text()
                    )
                )
                .get();

            if (!cells.length) {
              return;
            }

            const first =
              normalizeTurkish(
                cells[0]
              );

            if (
              first === 'TOPLAM' &&
              cells.length >= 2
            ) {
              const candidate =
                parseIntValue(
                  cells[1]
                );

              if (
                candidate !== null
              ) {
                careerTotal =
                  candidate;
              }
            }

            const yearMatch =
              first.match(
                /^((?:19|20)\d{2})(?: YILI)?$/
              );

            if (yearMatch) {
              statisticYears.add(
                Number(
                  yearMatch[1]
                )
              );
            }
          }
        );
    }
  );

  $(
    'select[name="QueryParameter_Yil"] option,' +
    'select#QueryParameter_Yil option'
  ).each(
    (_, option) => {
      const value =
        clean(
          $(option).attr(
            'value'
          )
        );

      if (
        /^(?:19|20)\d{2}$/.test(
          value
        )
      ) {
        statisticYears.add(
          Number(value)
        );
      }
    }
  );

  const pageText =
    normalizeTurkish(
      $.root().text()
    );

  let birthYear = null;

  const birthMatch =
    pageText.match(
      /DOG\.?\s*TRH\.?\s*\d{1,2}[./]\d{1,2}[./]((?:19|20)\d{2})/
    );

  if (birthMatch) {
    birthYear =
      Number(
        birthMatch[1]
      );
  }

  let pageResultTotal = null;
  let pageShown = null;

  const resultMatch =
    pageText.match(
      /TOPLAM\s+(\d+)\s+SONUCTAN\s+(\d+)\s+TANESI\s+GOSTERILIYOR/
    );

  if (resultMatch) {
    pageResultTotal =
      Number(
        resultMatch[1]
      );

    pageShown =
      Number(
        resultMatch[2]
      );
  }

  return {
    careerTotal,
    birthYear,

    statisticYears:
      Array.from(
        statisticYears
      ).sort(),

    pageResultTotal,
    pageShown
  };
}

/* =========================================================
   RECORD PARSE
========================================================= */

function parseHistory(
  html,
  horseId,
  sourceUrl,
  fallbackHeaders = null
) {
  const $ =
    cheerio.load(html);

  const horseName =
    extractHorseName($);

  const found =
    findHistoryTable($);

  let headers = [];
  let bodyRows = [];

  if (found) {
    headers =
      found.headers;

    bodyRows =
      $(found.table)
        .find('tbody tr')
        .toArray();

    if (
      !bodyRows.length
    ) {
      bodyRows =
        $(found.table)
          .find('tr')
          .slice(1)
          .toArray();
    }
  } else {
    headers =
      Array.isArray(
        fallbackHeaders
      )
        ? fallbackHeaders
        : [];

    if (!headers.length) {
      return {
        horseName,
        rows: []
      };
    }

    /*
      AJAX devam sayfası
      tam <table> içermeyebilir.
    */

    bodyRows =
      $('tbody tr')
        .toArray();

    if (
      !bodyRows.length
    ) {
      bodyRows =
        $('tr')
          .toArray();
    }
  }

  const rows = [];

  for (
    const tr of bodyRows
  ) {
    const cells =
      $(tr)
        .find('td')
        .toArray();

    if (
      cells.length < 6
    ) {
      continue;
    }

    const values =
      cells.map(
        td =>
          clean(
            $(td).text()
          )
      );

    const record = {};

    for (
      let i = 0;
      i <
      Math.min(
        headers.length,
        values.length
      );
      i++
    ) {
      record[
        headers[i]
      ] =
        values[i];
    }

    const raceDate =
      parseDate(
        record.tarih
      );

    if (!raceDate) {
      continue;
    }

    const track =
      splitTrack(
        record.pist_raw
      );

    const distance =
      parseIntValue(
        record.mesafe
      );

    const finish =
      parseIntValue(
        record.sira
      );

    /*
      26A benzersiz anahtarının
      JS karşılığı.
    */

    const uniqueKey =
      [
        String(horseId),
        raceDate,
        normalizeTurkish(
          record.sehir
        ),
        distance ?? '',
        finish ?? '',
        clean(
          record.derece
        )
      ].join('|');

    rows.push({
      uniqueKey,

      horseId:
        String(horseId),

      horseName:
        horseName || '',

      /*
        Karşılaştırmalarda bunu
        kullanacağız.
      */
      isoDate:
        raceDate,

      /*
        Ekranda.
      */
      date:
        isoToDisplay(
          raceDate
        ),

      city:
        clean(
          record.sehir
        ),

      /*
        26A MSF -> mesafe.
      */
      distance:
        distance ?? 0,

      msf:
        distance ?? 0,

      mesafe:
        distance ?? 0,

      track:
        track.surface,

      pist:
        track.surface,

      trackRaw:
        clean(
          record.pist_raw
        ),

      trackCondition:
        track.condition,

      finish:
        finish ?? 0,

      rank:
        finish ?? 0,

      sira:
        finish ?? 0,

      degree:
        clean(
          record.derece
        ) || null,

      weight:
        parseNumber(
          record.siklet
        ),

      equipment:
        clean(
          record.taki
        ) || null,

      jockey:
        clean(
          record.jokey
        ) || null,

      startNo:
        parseIntValue(
          record.st
        ),

      odds:
        parseNumber(
          record.ganyan
        ),

      /*
        TJK Grup:
        2İ / 3İ / 3+İ ...
      */
      groupRaw:
        clean(
          record.grup
        ) || null,

      ageGroup:
        normalizeAgeGroup(
          record.grup
        ),

      raceNoName:
        clean(
          record.kosu_no_adi
        ) || null,

      /*
        TJK Kcins:
        Maiden / ŞARTLI 4 /
        Handikap 16 / KV-8 ...
      */
      classRaw:
        clean(
          record.kcins
        ) || null,

      class:
        normalizeRaceClass(
          record.kcins
        ),

      raceClass:
        normalizeRaceClass(
          record.kcins
        ),

      trainer:
        clean(
          record.antrenor
        ) || null,

      owner:
        clean(
          record.sahip
        ) || null,

      hp:
        parseNumber(
          record.hp
        ),

      prize:
        parseNumber(
          record.ikramiye
        ),

      s20:
        parseNumber(
          record.s20
        ),

      sourceUrl
    });
  }

  return {
    horseName,
    rows
  };
}

/* =========================================================
   BENZERSİZ GEÇMİŞ
========================================================= */

function uniqueHistory(rows = []) {
  const map =
    new Map();

  for (
    const row of rows
  ) {
    if (
      row &&
      row.uniqueKey
    ) {
      map.set(
        row.uniqueKey,
        row
      );
    }
  }

  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      b.isoDate.localeCompare(
        a.isoDate
      )
  );
}

/* =========================================================
   DOĞRULANMIŞ DEVAM SAYFASI

   26A'daki temel mantık:
   - beklenen satır sayısı
   - hepsi yeni olmalı
   - tekrar sayfa kabul edilmez
========================================================= */

async function collectVerifiedPage(
  session,
  horseId,
  pageNumber,
  headers,
  expectedCount,
  existingKeys
) {
  let lastProblem =
    'sayfa alınamadı';

  for (
    let attempt = 1;
    attempt <= MAX_PAGE_TRY;
    attempt++
  ) {
    try {
      const page =
        await downloadHorsePage(
          session,
          horseId,
          pageNumber
        );

      const parsed =
        parseHistory(
          page.html,
          horseId,
          page.url,
          headers
        );

      const pageRows =
        uniqueHistory(
          parsed.rows
        );

      const freshRows =
        pageRows.filter(
          row =>
            !existingKeys.has(
              row.uniqueKey
            )
        );

      if (
        pageRows.length !==
        expectedCount
      ) {
        lastProblem =
          `beklenen ${expectedCount} satır, ` +
          `gelen ${pageRows.length}`;
      } else if (
        freshRows.length !==
        expectedCount
      ) {
        lastProblem =
          `beklenen ${expectedCount} yeni satır, ` +
          `gelen ${freshRows.length}; ` +
          `yanlış/tekrar sayfa`;
      } else {
        return freshRows;
      }

    } catch (e) {
      lastProblem =
        e?.message ||
        String(e);
    }

    if (
      attempt <
      MAX_PAGE_TRY
    ) {
      await sleep(
        Math.min(
          250 * attempt,
          1200
        )
      );
    }
  }

  throw new Error(
    `TJK TAM GEÇMİŞ KONTROLÜ: ` +
    `devam sayfası ${pageNumber} ` +
    `doğrulanamadı; ${lastProblem}.`
  );
}

/* =========================================================
   TAM KARİYERİ TOPLA

   26A collect_complete_history
   karşılığı.
========================================================= */

async function collectCompleteHistory(
  horseId
) {
  const session =
    createSession();

  /*
    İlk sayfa.
  */

  const first =
    await downloadHorsePage(
      session,
      horseId
    );

  const parsedFirst =
    parseHistory(
      first.html,
      horseId,
      first.url
    );

  const metadata =
    extractHistoryMetadata(
      first.html
    );

  if (
    metadata.careerTotal === null
  ) {
    throw new Error(
      'TJK TAM GEÇMİŞ KONTROLÜ: ' +
      'kariyer toplamı okunamadı.'
    );
  }

  let collected =
    uniqueHistory(
      parsedFirst.rows
    );

  const firstPageCount =
    collected.length;

  const expectedFirst =
    Math.min(
      PAGE_SIZE,
      metadata.careerTotal
    );

  if (
    firstPageCount !==
    expectedFirst
  ) {
    throw new Error(
      'TJK TAM GEÇMİŞ KONTROLÜ: ' +
      `ilk sayfada ${expectedFirst} kayıt ` +
      `beklenirken ${firstPageCount} kayıt ` +
      'ayrıştırıldı.'
    );
  }

  const totalPages =
    metadata.careerTotal > 0
      ? Math.ceil(
          metadata.careerTotal /
          PAGE_SIZE
        )
      : 0;

  const scannedPages = [];
  const pageCounts = {};

  /*
    50'den fazlaysa AJAX devam.
  */

  if (
    totalPages > 1
  ) {
    const headers =
      extractHistoryHeaders(
        first.html
      );

    if (!headers.length) {
      throw new Error(
        'TJK TAM GEÇMİŞ KONTROLÜ: ' +
        'ilk sayfanın geçmiş tablo başlıkları okunamadı.'
      );
    }

    const existingKeys =
      new Set(
        collected.map(
          row =>
            row.uniqueKey
        )
      );

    /*
      Python 26A:
      range(1, total_pages)
    */

    for (
      let pageNumber = 1;
      pageNumber < totalPages;
      pageNumber++
    ) {
      const expectedCount =
        Math.min(
          PAGE_SIZE,
          metadata.careerTotal -
          pageNumber * PAGE_SIZE
        );

      const pageRows =
        await collectVerifiedPage(
          session,
          horseId,
          pageNumber,
          headers,
          expectedCount,
          existingKeys
        );

      collected =
        uniqueHistory([
          ...collected,
          ...pageRows
        ]);

      for (
        const row of pageRows
      ) {
        existingKeys.add(
          row.uniqueKey
        );
      }

      scannedPages.push(
        pageNumber
      );

      pageCounts[
        pageNumber
      ] =
        pageRows.length;

      await sleep(
        REQUEST_DELAY_MS
      );
    }
  }

  const collectedTotal =
    collected.length;

  const missingCount =
    metadata.careerTotal -
    collectedTotal;

  if (
    missingCount !== 0
  ) {
    throw new Error(
      'TJK TAM GEÇMİŞ KONTROLÜ: ' +
      `kariyer toplamı ${metadata.careerTotal}, ` +
      `toplanan ${collectedTotal}, ` +
      `fark ${missingCount}.`
    );
  }

  return {
    horseName:
      parsedFirst.horseName,

    history:
      collected,

    audit: {
      ...metadata,

      firstPageCount,

      collectedTotal,

      missingCount: 0,

      scannedPages,

      pageCounts,

      coverageStatus:
        'TAM'
    }
  };
}

/* =========================================================
   BEFORE

   Kritik sızıntı kuralı:

   career_race_date
   <
   historical_race_date
========================================================= */

function applyBefore(
  rows,
  beforeIso
) {
  if (!beforeIso) {
    return rows;
  }

  return rows.filter(
    row =>
      row.isoDate <
      beforeIso
  );
}

/* =========================================================
   İLK 5
========================================================= */

function onlyTop5(
  rows
) {
  return rows.filter(
    row =>
      Number.isFinite(
        row.finish
      ) &&
      row.finish >= 1 &&
      row.finish <= 5
  );
}

/* =========================================================
   ÖZET
========================================================= */

function buildSummary(
  rows
) {
  return {
    totalTop5:
      rows.length,

    first:
      rows.filter(
        x =>
          x.finish === 1
      ).length,

    second:
      rows.filter(
        x =>
          x.finish === 2
      ).length,

    third:
      rows.filter(
        x =>
          x.finish === 3
      ).length,

    fourth:
      rows.filter(
        x =>
          x.finish === 4
      ).length,

    fifth:
      rows.filter(
        x =>
          x.finish === 5
      ).length
  };
}

/* =========================================================
   DOĞRULAMA
========================================================= */

function validateRoadmap(
  roadmap,
  beforeIso
) {
  const futureLeak =
    beforeIso
      ? roadmap.filter(
          row =>
            row.isoDate >=
            beforeIso
        )
      : [];

  const badFinish =
    roadmap.filter(
      row =>
        row.finish < 1 ||
        row.finish > 5
    );

  const missingDistance =
    roadmap.filter(
      row =>
        !row.distance ||
        row.distance <= 0
    );

  const missingAgeGroup =
    roadmap.filter(
      row =>
        !clean(
          row.ageGroup
        )
    );

  const missingClass =
    roadmap.filter(
      row =>
        !clean(
          row.class
        )
    );

  return {
    futureLeakCount:
      futureLeak.length,

    invalidFinishCount:
      badFinish.length,

    distanceMissingCount:
      missingDistance.length,

    ageGroupMissingCount:
      missingAgeGroup.length,

    classMissingCount:
      missingClass.length,

    valid:
      futureLeak.length === 0 &&
      badFinish.length === 0 &&
      missingDistance.length === 0
  };
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {
  const startedAt =
    Date.now();

  try {
    const horseId =
      clean(
        req.query.horseId ||
        req.query.id ||
        ''
      );

    const beforeRaw =
      clean(
        req.query.before ||
        ''
      );

    if (!horseId) {
      return res
        .status(400)
        .json({
          ok: false,
          version: VERSION,
          error:
            'horseId gerekli.'
        });
    }

    let beforeIso = '';

    if (beforeRaw) {
      beforeIso =
        parseDate(
          beforeRaw
        ) || '';

      if (!beforeIso) {
        return res
          .status(400)
          .json({
            ok: false,
            version: VERSION,
            error:
              'before YYYY-MM-DD veya DD.MM.YYYY biçiminde olmalı.'
          });
      }
    }

    /* =====================================================
       1. TAM KARİYER
    ===================================================== */

    const complete =
      await collectCompleteHistory(
        horseId
      );

    /* =====================================================
       2. TARİHSEL DONDURMA
    ===================================================== */

    const frozenHistory =
      applyBefore(
        complete.history,
        beforeIso
      );

    /* =====================================================
       3. YALNIZ İLK 5
    ===================================================== */

    const roadmap =
      onlyTop5(
        frozenHistory
      );

    /* =====================================================
       4. DOĞRULAMA
    ===================================================== */

    const validation =
      validateRoadmap(
        roadmap,
        beforeIso
      );

    /*
      V8'de veri eksikliği varsa
      sessizce başarılı saymayalım.
    */

    if (
      validation.futureLeakCount > 0
    ) {
      throw new Error(
        'Tarih sızıntısı tespit edildi.'
      );
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=900'
    );

    return res
      .status(200)
      .json({
        ok: true,

        version:
          VERSION,

        horseId:
          String(horseId),

        horseName:
          complete.horseName ||
          null,

        before:
          beforeIso ||
          null,

        rules: {
          source:
            'TJK AtKosuBilgileri',

          completeCareerRequired:
            true,

          historicalFreeze:
            beforeIso
              ? 'career_race_date < before'
              : 'NO_BEFORE_FILTER',

          historicalRaceDayExcluded:
            Boolean(beforeIso),

          finishFilter:
            '1 <= finish <= 5',

          leakageProtection:
            Boolean(beforeIso)
        },

        counts: {
          tjkCareerTotal:
            complete.audit.careerTotal,

          collectedTotal:
            complete.audit.collectedTotal,

          frozenCareerTotal:
            frozenHistory.length,

          top5:
            roadmap.length,

          distanceFilled:
            roadmap.filter(
              x =>
                x.distance > 0
            ).length,

          distanceMissing:
            validation.distanceMissingCount
        },

        summary:
          buildSummary(
            roadmap
          ),

        audit: {
          coverageStatus:
            complete.audit.coverageStatus,

          firstPageCount:
            complete.audit.firstPageCount,

          scannedPages:
            complete.audit.scannedPages,

          pageCounts:
            complete.audit.pageCounts,

          missingCount:
            complete.audit.missingCount,

          birthYear:
            complete.audit.birthYear,

          pageResultTotal:
            complete.audit.pageResultTotal,

          pageShown:
            complete.audit.pageShown
        },

        validation,

        /*
          ANA ALAN
        */

        roadmap,

        /*
          ESKİ FRONTEND /
          ROADMAP UYUMLULUĞU
        */

        top5:
          roadmap,

        races:
          roadmap,

        source: {
          type:
            'TJK_AT_KOSU_BILGILERI',

          endpoint:
            BASE_URL,

          columns: {
            date:
              'Tarih',

            city:
              'Şehir',

            distance:
              'Msf',

            track:
              'Pist',

            finish:
              'S',

            ageGroup:
              'Grup',

            class:
              'Kcins'
          },

          pagination: {
            pageSize:
              PAGE_SIZE,

            ajax:
              true,

            pageNumber:
              true,

            sort:
              'Tarih Desc',

            cacheBreaker:
              '_v435',

            sessionCookies:
              true
          }
        },

        durationMs:
          Date.now() -
          startedAt
      });

  } catch (e) {
    console.error(
      'tjk-career V8:',
      e
    );

    return res
      .status(500)
      .json({
        ok: false,

        version:
          VERSION,

        error:
          e?.message ||
          'At kariyer geçmişi alınamadı.',

        durationMs:
          Date.now() -
          startedAt
      });
  }
          }
