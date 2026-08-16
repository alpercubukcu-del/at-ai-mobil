const VERSION = 'TJK-ROADMAP-V3';

const FETCH_TIMEOUT_MS = 25000;

const DEFAULT_SIMILAR_LIMIT = 1;
const MAX_SIMILAR_LIMIT = 3;

const CURRENT_CONCURRENCY = 4;

/* =========================================================
   TEMEL
========================================================= */

function clean(value = '') {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trUpper(value = '') {
  return clean(value)
    .toLocaleUpperCase('tr-TR');
}

function normalizeText(value = '') {
  return trUpper(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/[^A-Z0-9+]+/g, '');
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function round1(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return null;
  }

  return Math.round(
    Number(value) * 10
  ) / 10;
}

function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  const text =
    clean(value)
      .replace(',', '.');

  const match =
    text.match(
      /-?\d+(?:\.\d+)?/
    );

  if (!match) {
    return null;
  }

  const n =
    Number(match[0]);

  return Number.isFinite(n)
    ? n
    : null;
}

function intValue(value) {
  const n =
    parseNumber(value);

  return n === null
    ? null
    : Math.trunc(n);
}

function parseDate(value = '') {
  const text =
    clean(value);

  let m =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (m) {
    return text;
  }

  m =
    text.match(
      /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/
    );

  if (m) {
    return (
      `${m[3]}-` +
      `${String(m[2]).padStart(2, '0')}-` +
      `${String(m[1]).padStart(2, '0')}`
    );
  }

  return '';
}

function queryInt(
  value,
  fallback,
  min,
  max
) {
  const n =
    intValue(value);

  if (n === null) {
    return fallback;
  }

  return clamp(
    n,
    min,
    max
  );
}

/* =========================================================
   TIMEOUT FETCH
========================================================= */

async function fetchJson(
  url
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      FETCH_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            Accept:
              'application/json',

            'Cache-Control':
              'no-cache',

            Pragma:
              'no-cache'
          },

          signal:
            controller.signal
        }
      );

    const text =
      await response.text();

    let data = null;

    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `JSON olmayan API cevabı: ${text.slice(0, 160)}`
      );
    }

    if (
      !response.ok ||
      data?.ok === false
    ) {
      throw new Error(
        data?.error ||
        `HTTP ${response.status}`
      );
    }

    return data;

  } catch (e) {
    if (
      e?.name ===
      'AbortError'
    ) {
      throw new Error(
        'TJK isteği zaman aşımına uğradı.'
      );
    }

    throw e;

  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   CONCURRENCY
========================================================= */

async function mapLimit(
  items,
  limit,
  mapper
) {
  const result =
    new Array(
      items.length
    );

  let cursor = 0;

  async function worker() {
    while (true) {
      const index =
        cursor++;

      if (
        index >=
        items.length
      ) {
        return;
      }

      try {
        result[index] =
          await mapper(
            items[index],
            index
          );
      } catch (e) {
        result[index] = {
          ok: false,

          error:
            e?.message ||
            String(e)
        };
      }
    }
  }

  const workers =
    Array.from(
      {
        length:
          Math.min(
            Math.max(
              1,
              limit
            ),
            items.length ||
            1
          )
      },

      () =>
        worker()
    );

  await Promise.all(
    workers
  );

  return result;
}

/* =========================================================
   OBJECT HELPERS
========================================================= */

function firstValue(
  object,
  keys
) {
  if (
    !object ||
    typeof object !==
    'object'
  ) {
    return undefined;
  }

  for (
    const key of keys
  ) {
    if (
      object[key] !==
      undefined &&
      object[key] !==
      null &&
      object[key] !==
      ''
    ) {
      return object[key];
    }
  }

  return undefined;
}

function firstArray(
  object,
  keys
) {
  if (
    !object ||
    typeof object !==
    'object'
  ) {
    return null;
  }

  for (
    const key of keys
  ) {
    if (
      Array.isArray(
        object[key]
      )
    ) {
      return object[key];
    }
  }

  return null;
}

function shallowObjects(
  object
) {
  if (
    !object ||
    typeof object !==
    'object'
  ) {
    return [];
  }

  const result = [
    object
  ];

  for (
    const key of [
      'condition',
      'conditions',
      'meta',
      'race',
      'raceInfo',
      'kosu',
      'details',
      'detail'
    ]
  ) {
    if (
      object[key] &&
      typeof object[key] ===
      'object' &&
      !Array.isArray(
        object[key]
      )
    ) {
      result.push(
        object[key]
      );
    }
  }

  return result;
}

function deepValue(
  object,
  keys
) {
  for (
    const part of
    shallowObjects(
      object
    )
  ) {
    const value =
      firstValue(
        part,
        keys
      );

    if (
      value !==
      undefined
    ) {
      return value;
    }
  }

  return undefined;
}

/* =========================================================
   PROGRAM PARSER

   Program API şemasında alan isimleri
   değişse bile at/koşu bulabilsin.
========================================================= */

function normalizeProgramHorse(
  horse
) {
  if (
    !horse ||
    typeof horse !==
    'object'
  ) {
    return null;
  }

  const horseId =
    clean(
      firstValue(
        horse,
        [
          'horseId',
          'atId',
          'at_id',
          'webAtId',
          'web_at_id',
          'id'
        ]
      )
    );

  const horseName =
    clean(
      firstValue(
        horse,
        [
          'horseName',
          'atAdi',
          'at_adi',
          'atadi',
          'name'
        ]
      )
    );

  const programNo =
    intValue(
      firstValue(
        horse,
        [
          'programNo',
          'horseNo',
          'atNo',
          'at_no',
          'number',
          'no'
        ]
      )
    );

  if (
    !horseId &&
    !horseName
  ) {
    return null;
  }

  return {
    horseId,
    horseName,
    programNo
  };
}

function normalizeProgramRace(
  object
) {
  if (
    !object ||
    typeof object !==
    'object'
  ) {
    return null;
  }

  const horsesRaw =
    firstArray(
      object,
      [
        'horses',
        'atlar',
        'runners',
        'horseList',
        'participants',
        'runnerList'
      ]
    );

  if (
    !horsesRaw ||
    !horsesRaw.length
  ) {
    return null;
  }

  const horses =
    horsesRaw
      .map(
        normalizeProgramHorse
      )
      .filter(Boolean);

  if (!horses.length) {
    return null;
  }

  const raceNo =
    intValue(
      deepValue(
        object,
        [
          'raceNo',
          'raceNumber',
          'kosuNo',
          'kosu_no',
          'kosuSirasi',
          'no'
        ]
      )
    );

  const raceClass =
    clean(
      deepValue(
        object,
        [
          'class',
          'raceClass',
          'kosuCinsi',
          'kosu_cinsi',
          'kcins',
          'yaradi1'
        ]
      )
    );

  const ageGroup =
    clean(
      deepValue(
        object,
        [
          'ageGroup',
          'age_group',
          'grup',
          'group',
          'yaradi2'
        ]
      )
    );

  const track =
    clean(
      deepValue(
        object,
        [
          'track',
          'pist',
          'surface'
        ]
      )
    );

  const distance =
    parseNumber(
      deepValue(
        object,
        [
          'distance',
          'mesafe',
          'msf'
        ]
      )
    );

  const city =
    clean(
      deepValue(
        object,
        [
          'city',
          'sehir',
          'hipodrom',
          'hippodrome'
        ]
      )
    );

  return {
    raceNo,
    class:
      raceClass,

    ageGroup,
    track,
    distance,
    city,
    horses
  };
}

function collectProgramRaces(
  input,
  maxDepth = 9
) {
  const races = [];
  const seen =
    new Set();

  function walk(
    value,
    depth
  ) {
    if (
      depth >
      maxDepth ||
      value === null ||
      value === undefined
    ) {
      return;
    }

    if (
      Array.isArray(
        value
      )
    ) {
      for (
        const item of value
      ) {
        walk(
          item,
          depth + 1
        );
      }

      return;
    }

    if (
      typeof value !==
      'object'
    ) {
      return;
    }

    const race =
      normalizeProgramRace(
        value
      );

    if (race) {
      const key =
        [
          race.raceNo ?? '',
          normalizeText(
            race.class
          ),
          normalizeText(
            race.ageGroup
          ),
          Number(
            race.distance ||
            0
          ),
          race.horses
            .map(
              h =>
                h.horseId ||
                h.horseName
            )
            .join(',')
        ].join('|');

      if (
        !seen.has(key)
      ) {
        seen.add(key);
        races.push(race);
      }
    }

    for (
      const child of
      Object.values(value)
    ) {
      if (
        child &&
        (
          Array.isArray(
            child
          ) ||
          typeof child ===
          'object'
        )
      ) {
        walk(
          child,
          depth + 1
        );
      }
    }
  }

  walk(
    input,
    0
  );

  return races;
}

/* =========================================================
   TARGET RACE MATCH
========================================================= */

function normalizeTrack(
  value
) {
  const t =
    normalizeText(
      value
    );

  if (
    t.includes('KUM') ||
    t.startsWith('K')
  ) {
    return 'KUM';
  }

  if (
    t.includes('CIM') ||
    t.startsWith('C')
  ) {
    return 'CIM';
  }

  if (
    t.includes('SENTETIK') ||
    t.startsWith('S')
  ) {
    return 'SENTETIK';
  }

  return t;
}

function classBase(
  value
) {
  const text =
    normalizeText(
      value
    );

  const handicap =
    text.match(
      /HANDIKAP(\d+)/
    );

  if (handicap) {
    return (
      `HANDIKAP${handicap[1]}`
    );
  }

  const sartli =
    text.match(
      /SARTLI(\d+)/
    );

  if (sartli) {
    return (
      `SARTLI${sartli[1]}`
    );
  }

  const kv =
    text.match(
      /KV(\d+)/
    );

  if (kv) {
    return (
      `KV${kv[1]}`
    );
  }

  if (
    text.includes(
      'MAIDEN'
    )
  ) {
    return 'MAIDEN';
  }

  if (
    text.includes('G1')
  ) {
    return 'G1';
  }

  if (
    text.includes('G2')
  ) {
    return 'G2';
  }

  if (
    text.includes('G3')
  ) {
    return 'G3';
  }

  return text;
}

function targetRaceMatches(
  race,
  target
) {
  let matched = 0;
  let tested = 0;

  if (
    target.class
  ) {
    tested++;

    if (
      classBase(
        race.class
      ) ===
      classBase(
        target.class
      )
    ) {
      matched++;
    }
  }

  if (
    target.ageGroup
  ) {
    tested++;

    if (
      normalizeText(
        race.ageGroup
      ) ===
      normalizeText(
        target.ageGroup
      )
    ) {
      matched++;
    }
  }

  if (
    target.track
  ) {
    tested++;

    if (
      normalizeTrack(
        race.track
      ) ===
      normalizeTrack(
        target.track
      )
    ) {
      matched++;
    }
  }

  if (
    target.distance
  ) {
    tested++;

    if (
      Number(
        race.distance
      ) ===
      Number(
        target.distance
      )
    ) {
      matched++;
    }
  }

  return {
    matched,
    tested,

    exact:
      tested > 0 &&
      matched === tested
  };
}

function chooseTargetRace(
  races,
  target,
  requestedRaceNo
) {
  if (!races.length) {
    throw new Error(
      'Günlük programdan koşular okunamadı.'
    );
  }

  if (
    requestedRaceNo !==
    null
  ) {
    const found =
      races.find(
        race =>
          Number(
            race.raceNo
          ) ===
          Number(
            requestedRaceNo
          )
      );

    if (!found) {
      throw new Error(
        `${requestedRaceNo}. koşu programda bulunamadı.`
      );
    }

    return found;
  }

  const exact =
    races.filter(
      race =>
        targetRaceMatches(
          race,
          target
        ).exact
    );

  if (
    exact.length === 1
  ) {
    return exact[0];
  }

  /*
    Exact yoksa en fazla koşulu
    eşleşen tek adayı kullan.
  */

  const scored =
    races
      .map(
        race => ({
          race,

          ...targetRaceMatches(
            race,
            target
          )
        })
      )
      .sort(
        (a, b) =>
          b.matched -
          a.matched
      );

  if (
    scored.length &&
    scored[0].matched > 0
  ) {
    const topScore =
      scored[0].matched;

    const top =
      scored.filter(
        x =>
          x.matched ===
          topScore
      );

    if (
      top.length === 1
    ) {
      return top[0].race;
    }
  }

  throw new Error(
    'Hedef koşu programda tekil olarak belirlenemedi. raceNo parametresi gerekli.'
  );
}

/* =========================================================
   SIMILAR RESPONSE

   V6 şeması değişse bile
   tarih+şehir+koşu no+puan içeren
   doğru listeyi bul.
========================================================= */

function looksLikeHistoricalCandidate(
  object
) {
  if (
    !object ||
    typeof object !==
    'object'
  ) {
    return false;
  }

  const date =
    firstValue(
      object,
      [
        'date',
        'tarih'
      ]
    );

  const city =
    firstValue(
      object,
      [
        'city',
        'sehir'
      ]
    );

  const raceNo =
    firstValue(
      object,
      [
        'raceNo',
        'raceNumber',
        'kosuNo',
        'kosu_no',
        'no'
      ]
    );

  const score =
    firstValue(
      object,
      [
        'score',
        'similarity',
        'raceSimilarity',
        'similarityScore'
      ]
    );

  return (
    Boolean(
      parseDate(date)
    ) &&
    Boolean(
      clean(city)
    ) &&
    intValue(
      raceNo
    ) !== null &&
    parseNumber(
      score
    ) !== null
  );
}

function findHistoricalArray(
  input,
  maxDepth = 8
) {
  let best = [];

  function walk(
    value,
    depth
  ) {
    if (
      depth >
      maxDepth ||
      value === null ||
      value === undefined
    ) {
      return;
    }

    if (
      Array.isArray(
        value
      )
    ) {
      const candidates =
        value.filter(
          looksLikeHistoricalCandidate
        );

      if (
        candidates.length >
        best.length
      ) {
        best =
          candidates;
      }

      for (
        const item of value
      ) {
        walk(
          item,
          depth + 1
        );
      }

      return;
    }

    if (
      typeof value ===
      'object'
    ) {
      for (
        const child of
        Object.values(
          value
        )
      ) {
        if (
          child &&
          (
            typeof child ===
            'object'
          )
        ) {
          walk(
            child,
            depth + 1
          );
        }
      }
    }
  }

  walk(
    input,
    0
  );

  return best;
}

function normalizeHistoricalRace(
  object
) {
  return {
    date:
      parseDate(
        firstValue(
          object,
          [
            'date',
            'tarih'
          ]
        )
      ),

    city:
      clean(
        firstValue(
          object,
          [
            'city',
            'sehir'
          ]
        )
      ),

    raceNo:
      intValue(
        firstValue(
          object,
          [
            'raceNo',
            'raceNumber',
            'kosuNo',
            'kosu_no',
            'no'
          ]
        )
      ),

    raceSimilarity:
      round1(
        parseNumber(
          firstValue(
            object,
            [
              'score',
              'similarity',
              'raceSimilarity',
              'similarityScore'
            ]
          )
        )
      ),

    raw:
      object
  };
}

/* =========================================================
   CAREER NORMALIZE
========================================================= */

function normalizeCareerRow(
  row
) {
  if (
    !row ||
    typeof row !==
    'object'
  ) {
    return null;
  }

  const isoDate =
    parseDate(
      firstValue(
        row,
        [
          'isoDate',
          'date',
          'tarih'
        ]
      )
    );

  const finish =
    intValue(
      firstValue(
        row,
        [
          'finish',
          'rank',
          'sira',
          'S'
        ]
      )
    );

  if (
    !isoDate ||
    finish === null ||
    finish < 1 ||
    finish > 5
  ) {
    return null;
  }

  return {
    isoDate,

    date:
      clean(
        firstValue(
          row,
          [
            'date',
            'tarih',
            'isoDate'
          ]
        )
      ),

    city:
      clean(
        firstValue(
          row,
          [
            'city',
            'sehir'
          ]
        )
      ),

    finish,

    class:
      clean(
        firstValue(
          row,
          [
            'class',
            'raceClass',
            'kcins'
          ]
        )
      ),

    ageGroup:
      clean(
        firstValue(
          row,
          [
            'ageGroup',
            'group',
            'grup'
          ]
        )
      ),

    track:
      clean(
        firstValue(
          row,
          [
            'track',
            'pist'
          ]
        )
      ),

    distance:
      parseNumber(
        firstValue(
          row,
          [
            'distance',
            'mesafe',
            'msf'
          ]
        )
      )
  };
}

function normalizeCareerPath(
  careerResponse
) {
  const raw =
    Array.isArray(
      careerResponse?.roadmap
    )
      ? careerResponse.roadmap
      : Array.isArray(
          careerResponse?.top5
        )
        ? careerResponse.top5
        : Array.isArray(
            careerResponse?.races
          )
          ? careerResponse.races
          : [];

  return raw
    .map(
      normalizeCareerRow
    )
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.isoDate.localeCompare(
          b.isoDate
        )
    );
}

/* =========================================================
   SINIF ÖZELLİKLERİ
========================================================= */

function classFamily(
  value
) {
  const text =
    normalizeText(
      value
    );

  if (
    text.includes(
      'MAIDEN'
    )
  ) {
    return 'MAIDEN';
  }

  if (
    text.includes(
      'SARTLI'
    )
  ) {
    return 'SARTLI';
  }

  if (
    text.includes(
      'HANDIKAP'
    )
  ) {
    return 'HANDIKAP';
  }

  if (
    /^KV/.test(
      text
    ) ||
    text.includes(
      'KV'
    )
  ) {
    return 'KV';
  }

  if (
    text.includes(
      'G1'
    )
  ) {
    return 'G1';
  }

  if (
    text.includes(
      'G2'
    )
  ) {
    return 'G2';
  }

  if (
    text.includes(
      'G3'
    )
  ) {
    return 'G3';
  }

  return (
    text ||
    'DIGER'
  );
}

function classLevel(
  value
) {
  const text =
    normalizeText(
      value
    );

  let m =
    text.match(
      /HANDIKAP(\d+)/
    );

  if (m) {
    return (
      `HANDIKAP${m[1]}`
    );
  }

  m =
    text.match(
      /SARTLI(\d+)/
    );

  if (m) {
    return (
      `SARTLI${m[1]}`
    );
  }

  m =
    text.match(
      /KV(\d+)/
    );

  if (m) {
    return (
      `KV${m[1]}`
    );
  }

  if (
    text.includes(
      'MAIDEN'
    )
  ) {
    return 'MAIDEN';
  }

  if (
    text.includes('G1')
  ) {
    return 'G1';
  }

  if (
    text.includes('G2')
  ) {
    return 'G2';
  }

  if (
    text.includes('G3')
  ) {
    return 'G3';
  }

  return (
    text ||
    'DIGER'
  );
}

/* =========================================================
   RESMİ HİPODROM KADEMESİ

   TJK 2026:
   I  İstanbul / Ankara
   II Adana / İzmir / Bursa /
      Antalya / Kocaeli
   III Şanlıurfa / Elazığ /
       Diyarbakır
========================================================= */

function cityTier(
  city
) {
  const c =
    normalizeText(
      city
    );

  const tier1 =
    new Set([
      'ISTANBUL',
      'ANKARA'
    ]);

  const tier2 =
    new Set([
      'ADANA',
      'IZMIR',
      'BURSA',
      'ANTALYA',
      'KOCAELI'
    ]);

  const tier3 =
    new Set([
      'SANLIURFA',
      'ELAZIG',
      'DIYARBAKIR'
    ]);

  if (
    tier1.has(c)
  ) {
    return 'I';
  }

  if (
    tier2.has(c)
  ) {
    return 'II';
  }

  if (
    tier3.has(c)
  ) {
    return 'III';
  }

  return (
    c ||
    'DIGER'
  );
}

/* =========================================================
   FİNİŞ BANDI
========================================================= */

function finishBand(
  finish
) {
  const n =
    Number(finish);

  if (n === 1) {
    return '1';
  }

  if (
    n === 2 ||
    n === 3
  ) {
    return '2-3';
  }

  return '4-5';
}

/* =========================================================
   MESAFE BANDI

   200 metreye yuvarlanır.
   Ağırlık kullanılmıyor.
========================================================= */

function distanceBucket(
  distance
) {
  const d =
    Number(distance);

  if (
    !Number.isFinite(d) ||
    d <= 0
  ) {
    return 'BILINMIYOR';
  }

  return String(
    Math.round(
      d / 200
    ) * 200
  );
}

/* =========================================================
   DTW FEATURE

   7 boyut.
   HER BOYUT EŞİT AĞIRLIKTA.

   1 ageGroup
   2 classFamily
   3 classLevel
   4 surface
   5 distanceBucket
   6 cityTier
   7 finishBand
========================================================= */

function careerVector(
  row
) {
  return [
    normalizeText(
      row.ageGroup
    ) ||
    'BILINMIYOR',

    classFamily(
      row.class
    ),

    classLevel(
      row.class
    ),

    normalizeTrack(
      row.track
    ) ||
    'BILINMIYOR',

    distanceBucket(
      row.distance
    ),

    cityTier(
      row.city
    ),

    finishBand(
      row.finish
    )
  ];
}

function vectorCost(
  a,
  b
) {
  let mismatch = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    if (
      a[i] !==
      b[i]
    ) {
      mismatch++;
    }
  }

  /*
    0 = tamamen aynı.
    1 = 7 boyutun tamamı farklı.
  */

  return (
    mismatch /
    a.length
  );
}

/* =========================================================
   DYNAMIC TIME WARPING

   Atların kariyer uzunlukları farklı
   olabilir. DTW bu nedenle kullanılıyor.

   Yalnız maliyet değil,
   hizalama adım sayısını da tutuyoruz.
========================================================= */

function dtwSimilarity(
  pathA,
  pathB
) {
  if (
    !Array.isArray(pathA) ||
    !Array.isArray(pathB) ||
    !pathA.length ||
    !pathB.length
  ) {
    return {
      similarity: null,

      normalizedCost:
        null,

      steps:
        0,

      reason:
        'KARİYER_YOLU_BOŞ'
    };
  }

  const a =
    pathA.map(
      careerVector
    );

  const b =
    pathB.map(
      careerVector
    );

  const n =
    a.length;

  const m =
    b.length;

  const cost =
    Array.from(
      {
        length:
          n + 1
      },
      () =>
        Array(
          m + 1
        ).fill(
          Infinity
        )
    );

  const steps =
    Array.from(
      {
        length:
          n + 1
      },
      () =>
        Array(
          m + 1
        ).fill(
          0
        )
    );

  cost[0][0] = 0;

  for (
    let i = 1;
    i <= n;
    i++
  ) {
    for (
      let j = 1;
      j <= m;
      j++
    ) {
      const local =
        vectorCost(
          a[i - 1],
          b[j - 1]
        );

      const options = [
        {
          cost:
            cost[i - 1][j],
          steps:
            steps[i - 1][j]
        },

        {
          cost:
            cost[i][j - 1],
          steps:
            steps[i][j - 1]
        },

        {
          cost:
            cost[i - 1][j - 1],
          steps:
            steps[i - 1][j - 1]
        }
      ];

      options.sort(
        (x, y) =>
          x.cost -
          y.cost
      );

      const best =
        options[0];

      cost[i][j] =
        best.cost +
        local;

      steps[i][j] =
        best.steps + 1;
    }
  }

  const stepCount =
    Math.max(
      1,
      steps[n][m]
    );

  const normalizedCost =
    clamp(
      cost[n][m] /
      stepCount,
      0,
      1
    );

  const similarity =
    clamp(
      100 *
      (
        1 -
        normalizedCost
      ),
      0,
      100
    );

  return {
    similarity:
      round1(
        similarity
      ),

    normalizedCost:
      round1(
        normalizedCost *
        100
      ),

    steps:
      stepCount,

    reason:
      null
  };
}

/* =========================================================
   TARİHSEL RACE + TOP3 + FROZEN CAREERS
========================================================= */

async function buildHistoricalRace(
  origin,
  historical
) {
  const started =
    Date.now();

  const historyUrl =
    `${origin}/api/tjk-history` +
    `?date=${encodeURIComponent(historical.date)}` +
    `&city=${encodeURIComponent(historical.city)}` +
    `&raceNo=${encodeURIComponent(historical.raceNo)}`;

  const history =
    await fetchJson(
      historyUrl
    );

  const top3 =
    Array.isArray(
      history.top3
    )
      ? history.top3
      : [];

  if (
    !top3.length
  ) {
    throw new Error(
      `${historical.date} ${historical.city} ${historical.raceNo}. koşu ilk 3 okunamadı.`
    );
  }

  const horses =
    await Promise.all(
      top3.map(
        async horse => {
          const horseId =
            clean(
              horse.horseId
            );

          if (!horseId) {
            return {
              ok: false,

              finish:
                intValue(
                  horse.finish
                ),

              horseName:
                clean(
                  horse.horseName
                ),

              error:
                'At ID yok.'
            };
          }

          const careerUrl =
            `${origin}/api/tjk-career` +
            `?horseId=${encodeURIComponent(horseId)}` +
            `&before=${encodeURIComponent(historical.date)}`;

          try {
            const career =
              await fetchJson(
                careerUrl
              );

            const path =
              normalizeCareerPath(
                career
              );

            return {
              ok: true,

              finish:
                intValue(
                  horse.finish
                ),

              horseId,

              horseName:
                clean(
                  horse.horseName
                ),

              programNo:
                intValue(
                  horse.programNo
                ),

              careerVersion:
                career.version ||
                null,

              top5BeforeCount:
                path.length,

              path
            };

          } catch (e) {
            return {
              ok: false,

              finish:
                intValue(
                  horse.finish
                ),

              horseId,

              horseName:
                clean(
                  horse.horseName
                ),

              error:
                e?.message ||
                String(e)
            };
          }
        }
      )
    );

  const winner =
    horses.find(
      h =>
        h.ok &&
        h.finish === 1
    );

  if (!winner) {
    throw new Error(
      `${historical.date} ${historical.city} ${historical.raceNo}. koşu kazanan kariyeri alınamadı.`
    );
  }

  return {
    ok: true,

    date:
      historical.date,

    city:
      historical.city,

    raceNo:
      historical.raceNo,

    raceSimilarity:
      historical.raceSimilarity,

    class:
      clean(
        history.class
      ),

    ageGroup:
      clean(
        history.ageGroup
      ),

    distance:
      parseNumber(
        history.distance
      ),

    track:
      clean(
        history.track
      ),

    conditionRaw:
      clean(
        history.conditionRaw
      ),

    historyVersion:
      history.version ||
      null,

    top3Count:
      horses.length,

    horses,

    winner,

    durationMs:
      Date.now() -
      started
  };
}

/* =========================================================
   BUGÜNKÜ AT CAREER
========================================================= */

async function loadCurrentHorse(
  origin,
  horse,
  targetDate
) {
  const started =
    Date.now();

  if (
    !horse.horseId
  ) {
    return {
      ok: false,

      ...horse,

      error:
        'At ID bulunamadı.'
    };
  }

  try {
    const careerUrl =
      `${origin}/api/tjk-career` +
      `?horseId=${encodeURIComponent(horse.horseId)}` +
      `&before=${encodeURIComponent(targetDate)}`;

    const career =
      await fetchJson(
        careerUrl
      );

    const path =
      normalizeCareerPath(
        career
      );

    return {
      ok: true,

      horseId:
        horse.horseId,

      horseName:
        horse.horseName ||
        career.horseName ||
        '',

      programNo:
        horse.programNo,

      careerVersion:
        career.version ||
        null,

      top5CareerCount:
        path.length,

      path,

      durationMs:
        Date.now() -
        started
    };

  } catch (e) {
    return {
      ok: false,

      horseId:
        horse.horseId,

      horseName:
        horse.horseName,

      programNo:
        horse.programNo,

      error:
        e?.message ||
        String(e),

      durationMs:
        Date.now() -
        started
    };
  }
}

/* =========================================================
   AT ↔ TARİHSEL TOP3 KARŞILAŞTIRMASI
========================================================= */

function comparisonWithHistoricalRace(
  currentHorse,
  historicalRace
) {
  const winner =
    historicalRace.horses.find(
      horse =>
        horse.ok &&
        horse.finish === 1
    );

  const second =
    historicalRace.horses.find(
      horse =>
        horse.ok &&
        horse.finish === 2
    );

  const third =
    historicalRace.horses.find(
      horse =>
        horse.ok &&
        horse.finish === 3
    );

  const winnerResult =
    winner
      ? dtwSimilarity(
          currentHorse.path,
          winner.path
        )
      : {
          similarity:
            null,

          reason:
            'KAZANAN_YOLU_YOK'
        };

  const secondResult =
    second
      ? dtwSimilarity(
          currentHorse.path,
          second.path
        )
      : {
          similarity:
            null
        };

  const thirdResult =
    third
      ? dtwSimilarity(
          currentHorse.path,
          third.path
        )
      : {
          similarity:
            null
        };

  return {
    historicalDate:
      historicalRace.date,

    city:
      historicalRace.city,

    raceNo:
      historicalRace.raceNo,

    raceSimilarity:
      historicalRace.raceSimilarity,

    /*
      ANA REFERANS:
      TARİHSEL KAZANAN.
    */

    winnerHorseId:
      winner?.horseId ||
      null,

    winnerHorseName:
      winner?.horseName ||
      null,

    historicalWinnerPathLength:
      winner?.path?.length ||
      0,

    currentPathLength:
      currentHorse.path.length,

    winnerSimilarity:
      winnerResult.similarity,

    winnerNormalizedCost:
      winnerResult.normalizedCost ??
      null,

    winnerAlignmentSteps:
      winnerResult.steps ??
      0,

    winnerReason:
      winnerResult.reason ||
      null,

    /*
      Destekleyici kontrol.
      Final sıralamaya girmez.
    */

    secondHorseName:
      second?.horseName ||
      null,

    secondSimilarity:
      secondResult.similarity,

    thirdHorseName:
      third?.horseName ||
      null,

    thirdSimilarity:
      thirdResult.similarity
  };
}

/* =========================================================
   FINAL HORSE SCORE

   Sadece tarihsel KAZANANLAR.

   Birden fazla benzer yarış
   varsa kazanan benzerliklerinin
   aritmetik ortalaması.
========================================================= */

function scoreCurrentHorse(
  currentHorse,
  historicalRaces
) {
  if (
    !currentHorse.ok
  ) {
    return {
      ...currentHorse,

      galibiyetBenzerligi:
        null,

      probability:
        false,

      comparisons: [],

      reason:
        currentHorse.error ||
        'KARİYER_ALINAMADI'
    };
  }

  if (
    !currentHorse.path.length
  ) {
    return {
      ...currentHorse,

      galibiyetBenzerligi:
        null,

      probability:
        false,

      comparisons: [],

      reason:
        'BUGUNKU_AT_ILK5_KARIYERI_YOK'
    };
  }

  const comparisons =
    historicalRaces.map(
      historicalRace =>
        comparisonWithHistoricalRace(
          currentHorse,
          historicalRace
        )
    );

  const winnerScores =
    comparisons
      .map(
        x =>
          x.winnerSimilarity
      )
      .filter(
        x =>
          Number.isFinite(
            Number(x)
          )
      )
      .map(Number);

  const finalScore =
    winnerScores.length
      ? winnerScores.reduce(
          (a, b) =>
            a + b,
          0
        ) /
        winnerScores.length
      : null;

  return {
    ok: true,

    horseId:
      currentHorse.horseId,

    horseName:
      currentHorse.horseName,

    programNo:
      currentHorse.programNo,

    top5CareerCount:
      currentHorse.path.length,

    careerVersion:
      currentHorse.careerVersion,

    galibiyetBenzerligi:
      finalScore === null
        ? null
        : round1(
            finalScore
          ),

    probability:
      false,

    comparisons,

    reason:
      finalScore === null
        ? 'TARIHSEL_KAZANAN_KARSILASTIRMASI_YOK'
        : null
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

  const diagnostics = [];

  try {

    /* =====================================================
       PARAMETRELER
    ===================================================== */

    const date =
      parseDate(
        req.query.date
      );

    const city =
      clean(
        req.query.city
      );

    const targetClass =
      clean(
        req.query.class
      );

    const ageGroup =
      clean(
        req.query.ageGroup
      );

    const track =
      clean(
        req.query.track
      );

    const distance =
      parseNumber(
        req.query.distance
      );

    const requestedRaceNo =
      req.query.raceNo !==
      undefined
        ? intValue(
            req.query.raceNo
          )
        : null;

    const similarLimit =
      queryInt(
        req.query.similarLimit,
        DEFAULT_SIMILAR_LIMIT,
        1,
        MAX_SIMILAR_LIMIT
      );

    if (!date) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'date gerekli. YYYY-MM-DD'
        });
    }

    if (!city) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'city gerekli.'
        });
    }

    if (
      !targetClass ||
      !ageGroup ||
      !track ||
      !distance
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'class, ageGroup, track ve distance gerekli.'
        });
    }

    const proto =
      clean(
        req.headers[
          'x-forwarded-proto'
        ]
      ) ||
      'https';

    const host =
      clean(
        req.headers.host
      );

    if (!host) {
      throw new Error(
        'Sunucu host bilgisi alınamadı.'
      );
    }

    const origin =
      `${proto}://${host}`;

    const target = {
      date,
      city,

      class:
        targetClass,

      ageGroup,
      track,
      distance
    };

    /* =====================================================
       1. GÜNLÜK PROGRAM

       Bugün koşacak gerçek atları bul.
    ===================================================== */

    const programStarted =
      Date.now();

    let program = null;

    try {
      const programUrl =
        `${origin}/api/tjk-program` +
        `?date=${encodeURIComponent(date)}` +
        `&city=${encodeURIComponent(city)}`;

      program =
        await fetchJson(
          programUrl
        );

    } catch (firstError) {
      /*
        Bazı program sürümlerinde
        city parametresi kullanılmıyorsa
        date-only tekrar dene.
      */

      const programUrl =
        `${origin}/api/tjk-program` +
        `?date=${encodeURIComponent(date)}`;

      program =
        await fetchJson(
          programUrl
        );
    }

    const programRaces =
      collectProgramRaces(
        program
      );

    const targetRace =
      chooseTargetRace(
        programRaces,
        target,
        requestedRaceNo
      );

    if (
      !targetRace.horses.length
    ) {
      throw new Error(
        'Hedef koşunun atları günlük programdan okunamadı.'
      );
    }

    diagnostics.push({
      stage:
        'PROGRAM',

      ok:
        true,

      raceCount:
        programRaces.length,

      targetRaceNo:
        targetRace.raceNo,

      targetHorseCount:
        targetRace.horses.length,

      durationMs:
        Date.now() -
        programStarted
    });

    /* =====================================================
       2. TARİHSEL BENZERLER

       maxPages=1:
       Similar V6'nın doğrulanmış
       filtreli ilk sayfası.
    ===================================================== */

    const similarStarted =
      Date.now();

    const similarUrl =
      `${origin}/api/tjk-similar` +
      `?date=${encodeURIComponent(date)}` +
      `&city=${encodeURIComponent(city)}` +
      `&class=${encodeURIComponent(targetClass)}` +
      `&ageGroup=${encodeURIComponent(ageGroup)}` +
      `&track=${encodeURIComponent(track)}` +
      `&distance=${encodeURIComponent(distance)}` +
      `&maxPages=1` +
      `&limit=${encodeURIComponent(similarLimit)}`;

    const similar =
      await fetchJson(
        similarUrl
      );

    const similarArray =
      findHistoricalArray(
        similar
      );

    let historicalCandidates =
      similarArray
        .map(
          normalizeHistoricalRace
        )
        .filter(
          x =>
            x.date &&
            x.city &&
            x.raceNo !==
            null &&
            x.date <
            date
        );

    /*
      Aynı koşuyu iki kez alma.
    */

    const seenHistorical =
      new Set();

    historicalCandidates =
      historicalCandidates.filter(
        race => {
          const key =
            `${race.date}|${normalizeText(race.city)}|${race.raceNo}`;

          if (
            seenHistorical.has(
              key
            )
          ) {
            return false;
          }

          seenHistorical.add(
            key
          );

          return true;
        }
      );

    historicalCandidates =
      historicalCandidates
        .sort(
          (a, b) =>
            Number(
              b.raceSimilarity ||
              0
            ) -
            Number(
              a.raceSimilarity ||
              0
            )
        )
        .slice(
          0,
          similarLimit
        );

    if (
      !historicalCandidates.length
    ) {
      throw new Error(
        'Kullanılabilir tarihsel benzer yarış bulunamadı.'
      );
    }

    diagnostics.push({
      stage:
        'SIMILAR',

      ok:
        true,

      version:
        similar.version ||
        null,

      found:
        similarArray.length,

      used:
        historicalCandidates.length,

      pagesRead:
        similar.pagesRead ??
        null,

      scanned:
        similar.scanned ??
        null,

      durationMs:
        Date.now() -
        similarStarted
    });

    /* =====================================================
       3. TARİHSEL BENZERLERİN
          GERÇEK İLK 3 + FROZEN CAREERS
    ===================================================== */

    const historicalResults =
      await Promise.all(
        historicalCandidates.map(
          async race => {
            const stageStarted =
              Date.now();

            try {
              const value =
                await buildHistoricalRace(
                  origin,
                  race
                );

              diagnostics.push({
                stage:
                  `HISTORICAL_${race.date}_${race.city}_${race.raceNo}`,

                ok:
                  true,

                durationMs:
                  Date.now() -
                  stageStarted
              });

              return value;

            } catch (e) {
              diagnostics.push({
                stage:
                  `HISTORICAL_${race.date}_${race.city}_${race.raceNo}`,

                ok:
                  false,

                error:
                  e?.message ||
                  String(e),

                durationMs:
                  Date.now() -
                  stageStarted
              });

              return {
                ok: false,

                date:
                  race.date,

                city:
                  race.city,

                raceNo:
                  race.raceNo,

                error:
                  e?.message ||
                  String(e)
              };
            }
          }
        )
      );

    const validHistorical =
      historicalResults.filter(
        x =>
          x.ok &&
          x.winner &&
          Array.isArray(
            x.winner.path
          ) &&
          x.winner.path.length
      );

    if (
      !validHistorical.length
    ) {
      throw new Error(
        'Tarihsel benzer yarışların kazanan kariyer yolları alınamadı.'
      );
    }

    /* =====================================================
       4. BUGÜN KOŞACAK ATLARIN
          TARGET DATE ÖNCESİ TÜM TOP5 YOLU
    ===================================================== */

    const currentStarted =
      Date.now();

    const currentHorses =
      await mapLimit(
        targetRace.horses,
        CURRENT_CONCURRENCY,

        horse =>
          loadCurrentHorse(
            origin,
            horse,
            date
          )
      );

    diagnostics.push({
      stage:
        'CURRENT_HORSES',

      ok:
        true,

      total:
        currentHorses.length,

      successful:
        currentHorses.filter(
          x =>
            x.ok
        ).length,

      failed:
        currentHorses.filter(
          x =>
            !x.ok
        ).length,

      durationMs:
        Date.now() -
        currentStarted
    });

    /* =====================================================
       5. GALİBİYET BENZERLİĞİ
    ===================================================== */

    const ranking =
      currentHorses
        .map(
          horse =>
            scoreCurrentHorse(
              horse,
              validHistorical
            )
        )
        .sort(
          (a, b) => {
            const av =
              Number.isFinite(
                Number(
                  a.galibiyetBenzerligi
                )
              )
                ? Number(
                    a.galibiyetBenzerligi
                  )
                : -1;

            const bv =
              Number.isFinite(
                Number(
                  b.galibiyetBenzerligi
                )
              )
                ? Number(
                    b.galibiyetBenzerligi
                  )
                : -1;

            if (
              bv !== av
            ) {
              return bv - av;
            }

            return (
              Number(
                a.programNo ||
                999
              ) -
              Number(
                b.programNo ||
                999
              )
            );
          }
        );

    let rankCounter = 0;

    const finalRanking =
      ranking.map(
        horse => {
          if (
            horse.galibiyetBenzerligi !==
            null
          ) {
            rankCounter++;

            return {
              rank:
                rankCounter,

              ...horse
            };
          }

          return {
            rank:
              null,

            ...horse
          };
        }
      );

    /* =====================================================
       6. TARİHSEL RACE OUTPUT

       Yol haritalarını kullanıcıya
       açıklanabilir biçimde bırak.
    ===================================================== */

    const historicalRacesOutput =
      historicalResults.map(
        race => {
          if (!race.ok) {
            return race;
          }

          return {
            ok: true,

            date:
              race.date,

            city:
              race.city,

            raceNo:
              race.raceNo,

            raceSimilarity:
              race.raceSimilarity,

            class:
              race.class,

            ageGroup:
              race.ageGroup,

            distance:
              race.distance,

            track:
              race.track,

            conditionRaw:
              race.conditionRaw,

            historyVersion:
              race.historyVersion,

            top3Count:
              race.top3Count,

            horses:
              race.horses.map(
                horse => ({
                  ok:
                    horse.ok,

                  finish:
                    horse.finish,

                  horseId:
                    horse.horseId,

                  horseName:
                    horse.horseName,

                  programNo:
                    horse.programNo,

                  careerVersion:
                    horse.careerVersion,

                  top5BeforeCount:
                    horse.top5BeforeCount,

                  roadmap:
                    Array.isArray(
                      horse.path
                    )
                      ? horse.path.map(
                          row => ({
                            date:
                              row.date,

                            isoDate:
                              row.isoDate,

                            city:
                              row.city,

                            finish:
                              row.finish,

                            class:
                              row.class,

                            ageGroup:
                              row.ageGroup,

                            track:
                              row.track,

                            distance:
                              row.distance
                          })
                        )
                      : [],

                  error:
                    horse.error ||
                    null
                })
              )
          };
        }
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.setHeader(
      'Cache-Control',
      's-maxage=120, stale-while-revalidate=600'
    );

    return res
      .status(200)
      .json({
        ok: true,

        version:
          VERSION,

        target,

        targetRace: {
          raceNo:
            targetRace.raceNo,

          class:
            targetRace.class ||
            targetClass,

          ageGroup:
            targetRace.ageGroup ||
            ageGroup,

          track:
            targetRace.track ||
            track,

          distance:
            targetRace.distance ||
            distance,

          city:
            targetRace.city ||
            city,

          horseCount:
            targetRace.horses.length
        },

        rules: {
          historicalRace:
            'historical_race_date < target_date',

          historicalCareer:
            'career_race_date < historical_race_date',

          currentCareer:
            'career_race_date < target_date',

          careerFinish:
            '1 <= finish <= 5',

          useHistoricalTop3:
            true,

          rankingUsesHistoricalWinnerOnly:
            true,

          secondAndThirdAreSupportSignals:
            true,

          leakageProtection:
            true
        },

        scoreMethod: {
          scoreType:
            'KARIYER_YOLU_DTW_BENZERLIGI',

          displayName:
            'Galibiyet Benzerliği',

          probability:
            false,

          notProbability:
            true,

          calibrated:
            false,

          method:
            'EQUAL_WEIGHT_DTW',

          rankingBasis:
            'HISTORICAL_WINNERS_ONLY',

          historicalRaceSimilarityUsage:
            'SELECTION_ONLY_NOT_MULTIPLIED_INTO_HORSE_SCORE',

          dimensions: [
            'ageGroup',
            'classFamily',
            'classLevel',
            'surface',
            'distanceBucket',
            'cityTier',
            'finishBand'
          ],

          dimensionWeights:
            'EQUAL',

          dimensionCount:
            7,

          distanceBucketMeters:
            200,

          finishBands: [
            '1',
            '2-3',
            '4-5'
          ],

          explanation:
            'Bu değer kazanma olasılığı değildir. Bugünkü atın ilk-5 kariyer yolunun, benzer tarihsel yarışların gerçek kazananlarının yarış öncesindeki ilk-5 kariyer yollarına DTW ile yapısal benzerliğidir.'
        },

        similar: {
          version:
            similar.version ||
            null,

          pagesRead:
            similar.pagesRead ??
            null,

          scanned:
            similar.scanned ??
            null,

          found:
            similarArray.length,

          used:
            validHistorical.length,

          requestedLimit:
            similarLimit
        },

        historicalRaceCount:
          validHistorical.length,

        historicalHorseCount:
          validHistorical.reduce(
            (sum, race) =>
              sum +
              race.horses.filter(
                h =>
                  h.ok
              ).length,
            0
          ),

        currentHorseCount:
          currentHorses.length,

        successfulCurrentCareerCount:
          currentHorses.filter(
            x =>
              x.ok
          ).length,

        failedCurrentCareerCount:
          currentHorses.filter(
            x =>
              !x.ok
          ).length,

        /*
          ANA SONUÇ
        */

        ranking:
          finalRanking,

        /*
          FRONTEND İÇİN ALIAS
        */

        currentHorses:
          finalRanking,

        historicalRaces:
          historicalRacesOutput,

        failures: [
          ...historicalResults
            .filter(
              x =>
                !x.ok
            )
            .map(
              x => ({
                type:
                  'HISTORICAL_RACE',

                date:
                  x.date,

                city:
                  x.city,

                raceNo:
                  x.raceNo,

                error:
                  x.error
              })
            ),

          ...currentHorses
            .filter(
              x =>
                !x.ok
            )
            .map(
              x => ({
                type:
                  'CURRENT_HORSE',

                horseId:
                  x.horseId,

                horseName:
                  x.horseName,

                error:
                  x.error
              })
            )
        ],

        diagnostics,

        sourceChain: [
          'tjk-program V3',
          'tjk-similar V6 maxPages=1',
          'tjk-history V1',
          'tjk-career V8',
          'equal-weight DTW career-path comparison'
        ],

        durationMs:
          Date.now() -
          startedAt
      });

  } catch (e) {

    console.error(
      'tjk-roadmap V3:',
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
          'Kariyer yol haritası karşılaştırması oluşturulamadı.',

        diagnostics,

        durationMs:
          Date.now() -
          startedAt
      });
  }
}
