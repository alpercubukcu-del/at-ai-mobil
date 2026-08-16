import * as cheerio from 'cheerio';

const TJK = 'https://www.tjk.org';

const PAGE_URL =
  `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;

const DATA_URL =
  `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;

const ROWS_URL =
  `${TJK}/TR/YarisSever/Query/DataRows/KosuSorgulama`;

const SORT =
  'Tarih desc, Sehir asc, KosuSirasi asc';

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':
    'tr-TR,tr;q=0.9,en;q=0.7',
  referer:
    PAGE_URL
};

/* =========================================================
   2026 GENEL HÜKÜMLER
   SAYFA 28 - HANDİKAP PUAN ARALIKLARI
========================================================= */

const HANDICAP_BANDS = {
  13: {
    H1: [1, 45],
    H2: [1, 40],
    H3: [1, 35]
  },

  14: {
    H1: [1, 55],
    H2: [1, 50],
    H3: [1, 45]
  },

  15: {
    H1: [1, 65],
    H2: [1, 60],
    H3: [1, 55]
  },

  16: {
    H1: [1, 75],
    H2: [1, 70],
    H3: [1, 65]
  },

  17: {
    H1: [46, 88],
    H2: [41, 83],
    H3: [1, 75]
  },

  21: {
    H1: [56, 93],
    H2: [51, 88]
  },

  22: {
    H1: [61, 98],
    H2: [56, 93]
  },

  24: {
    H1: [66, 105],
    H2: [61, 100]
  }
};

const G3_HANDICAP_BAND =
  [71, 110];

/* =========================================================
   2026 GENEL HÜKÜMLER
   SAYFA 29 - HİPODROM KADEMELERİ
========================================================= */

const TRACK_TIERS = {
  'İSTANBUL': 1,
  'ANKARA': 1,

  'ADANA': 2,
  'İZMİR': 2,
  'BURSA': 2,
  'ANTALYA': 2,
  'KOCAELİ': 2,

  'ŞANLIURFA': 3,
  'ELAZIĞ': 3,
  'DİYARBAKIR': 3
};

/* =========================================================
   TEMEL YARDIMCILAR
========================================================= */

function clean(v = '') {
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function upper(v = '') {
  return clean(v)
    .toLocaleUpperCase('tr-TR');
}

function normalizeLetters(v = '') {
  return upper(v)
    .replace(/HANDIKAP/g, 'HANDİKAP')
    .replace(/INGILIZ/g, 'İNGİLİZ')
    .replace(/INGİLİZ/g, 'İNGİLİZ');
}

function parseDate(value = '') {
  const m =
    clean(value).match(
      /^(\d{2})[./](\d{2})[./](\d{4})$/
    );

  if (!m) return null;

  return {
    display:
      `${m[1]}.${m[2]}.${m[3]}`,

    iso:
      `${m[3]}-${m[2]}-${m[1]}`
  };
}

function isoToDisplay(iso = '') {
  const m =
    String(iso).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!m) return '';

  return `${m[3]}.${m[2]}.${m[1]}`;
}

function normalizeTrack(v = '') {
  const t =
    normalizeLetters(v);

  if (
    t.includes('SENTETİK')
  ) {
    return 'Sentetik';
  }

  if (
    t.includes('ÇİM')
  ) {
    return 'Çim';
  }

  if (
    t.includes('KUM')
  ) {
    return 'Kum';
  }

  return clean(v);
}

function normalizeClass(v = '') {
  return clean(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAgeGroup(v = '') {
  return normalizeLetters(v);
}

/* =========================================================
   YAŞ GRUBU ÇÖZÜMLEME
========================================================= */

function parseAgeGroup(v = '') {
  const t =
    normalizeAgeGroup(v);

  let breed = '';

  if (
    t.includes('İNGİLİZ')
  ) {
    breed = 'I';
  } else if (
    t.includes('ARAP')
  ) {
    breed = 'A';
  }

  let minAge = null;
  let maxAge = null;

  let m =
    t.match(
      /(\d+)\s*VE\s*YUKARI/
    );

  if (m) {
    minAge =
      Number(m[1]);

    maxAge =
      99;

    return {
      breed,
      minAge,
      maxAge,
      raw: t
    };
  }

  m =
    t.match(
      /(\d+)\s*YAŞLI/
    );

  if (m) {
    minAge =
      Number(m[1]);

    maxAge =
      Number(m[1]);

    return {
      breed,
      minAge,
      maxAge,
      raw: t
    };
  }

  /*
    Kısa kodlar:
    3İ
    3+İ
    4+A
  */

  m =
    t.match(
      /^(\d+)\+?([İIA])$/
    );

  if (m) {
    minAge =
      Number(m[1]);

    maxAge =
      t.includes('+')
        ? 99
        : minAge;

    breed =
      m[2] === 'A'
        ? 'A'
        : 'I';
  }

  return {
    breed,
    minAge,
    maxAge,
    raw: t
  };
}

function ageGroupScore(
  target,
  past
) {
  const a =
    parseAgeGroup(target);

  const b =
    parseAgeGroup(past);

  if (
    a.breed &&
    b.breed &&
    a.breed !== b.breed
  ) {
    return 0;
  }

  if (
    normalizeAgeGroup(target) ===
    normalizeAgeGroup(past)
  ) {
    return 20;
  }

  if (
    a.minAge === null ||
    b.minAge === null
  ) {
    return 0;
  }

  /*
    Aynı yaş kümesi örtüşüyor mu?
  */

  const low =
    Math.max(
      a.minAge,
      b.minAge
    );

  const high =
    Math.min(
      a.maxAge,
      b.maxAge
    );

  if (
    low > high
  ) {
    return 0;
  }

  /*
    Örnek:
    3 Yaşlı İngiliz
    ↔ 3 ve Yukarı İngiliz

    Tam aynı değil,
    fakat ortak yaş var.
  */

  if (
    a.minAge === b.minAge
  ) {
    return 14;
  }

  return 8;
}

/* =========================================================
   HANDİKAP SINIFI
========================================================= */

function parseHandicap(
  value = ''
) {
  const t =
    normalizeLetters(
      normalizeClass(value)
    );

  let m =
    t.match(
      /HANDİKAP\s*(\d+)/
    );

  if (!m) {
    return null;
  }

  const number =
    Number(m[1]);

  const hm =
    t.match(
      /\/H([123])\b/
    );

  const hLevel =
    hm
      ? `H${hm[1]}`
      : null;

  return {
    number,
    hLevel,
    raw: t
  };
}

function handicapBand(
  handicap
) {
  if (!handicap) {
    return null;
  }

  if (
    !HANDICAP_BANDS[
      handicap.number
    ]
  ) {
    return null;
  }

  if (
    handicap.hLevel &&
    HANDICAP_BANDS[
      handicap.number
    ][
      handicap.hLevel
    ]
  ) {
    return HANDICAP_BANDS[
      handicap.number
    ][
      handicap.hLevel
    ];
  }

  /*
    H seviyesi yoksa o handikap
    numarasının en geniş resmi bandı.
  */

  const bands =
    Object.values(
      HANDICAP_BANDS[
        handicap.number
      ]
    );

  if (!bands.length) {
    return null;
  }

  return [
    Math.min(
      ...bands.map(
        x => x[0]
      )
    ),

    Math.max(
      ...bands.map(
        x => x[1]
      )
    )
  ];
}

function bandOverlap(
  a,
  b
) {
  if (!a || !b) {
    return 0;
  }

  const low =
    Math.max(
      a[0],
      b[0]
    );

  const high =
    Math.min(
      a[1],
      b[1]
    );

  if (
    high < low
  ) {
    return 0;
  }

  const intersection =
    high - low + 1;

  const unionLow =
    Math.min(
      a[0],
      b[0]
    );

  const unionHigh =
    Math.max(
      a[1],
      b[1]
    );

  const union =
    unionHigh -
    unionLow +
    1;

  return (
    intersection /
    union
  );
}

/* =========================================================
   SINIF AİLESİ
========================================================= */

function parseRaceFamily(
  value = ''
) {
  const t =
    normalizeLetters(
      normalizeClass(value)
    );

  const handicap =
    parseHandicap(t);

  if (handicap) {
    return {
      family:
        'HANDICAP',

      level:
        handicap.number,

      handicap
    };
  }

  let m =
    t.match(
      /ŞARTLI\s*(\d+)/
    );

  if (m) {
    return {
      family:
        'SARTLI',

      level:
        Number(m[1])
    };
  }

  m =
    t.match(
      /\bKV[-\s]*(\d+)\b/
    );

  if (m) {
    return {
      family:
        'KV',

      level:
        Number(m[1])
    };
  }

  m =
    t.match(
      /\bG([123])\b/
    );

  if (m) {
    return {
      family:
        'GROUP',

      level:
        Number(m[1])
    };
  }

  if (
    t.includes('MAIDEN')
  ) {
    return {
      family:
        'MAIDEN',

      level:
        0
    };
  }

  if (
    t.includes('SATIŞ') ||
    t.includes('SATIS')
  ) {
    const sm =
      t.match(
        /SATIŞ\s*(\d+)|SATIS\s*(\d+)/
      );

    return {
      family:
        'SATIS',

      level:
        sm
          ? Number(
              sm[1] ||
              sm[2]
            )
          : 0
    };
  }

  return {
    family:
      t.split('/')[0],
    level:
      null
  };
}

/* =========================================================
   SINIF BENZERLİĞİ - 30 PUAN
========================================================= */

function classScore(
  targetClass,
  pastClass
) {
  const a =
    parseRaceFamily(
      targetClass
    );

  const b =
    parseRaceFamily(
      pastClass
    );

  if (
    a.family !==
    b.family
  ) {
    return {
      score: 0,
      reason:
        'FARKLI_KOSU_AILESI'
    };
  }

  /*
    HANDİKAP:
    resmi puan bantlarını kullan.
  */

  if (
    a.family ===
    'HANDICAP'
  ) {
    const bandA =
      handicapBand(
        a.handicap
      );

    const bandB =
      handicapBand(
        b.handicap
      );

    /*
      Tam H16/H3 ↔ H16/H3
    */

    if (
      a.handicap.number ===
        b.handicap.number &&
      a.handicap.hLevel &&
      b.handicap.hLevel &&
      a.handicap.hLevel ===
        b.handicap.hLevel
    ) {
      return {
        score: 30,
        reason:
          'HANDICAP_TAM_ESLESME',

        bandA,
        bandB,
        overlap: 1
      };
    }

    /*
      Resmi bantların örtüşme oranı.
    */

    const overlap =
      bandOverlap(
        bandA,
        bandB
      );

    /*
      24 puan:
      resmi HP bandı örtüşmesi.

      6 puan:
      aynı Handikap numarası bonusu.
    */

    let score =
      overlap * 24;

    if (
      a.handicap.number ===
      b.handicap.number
    ) {
      score += 6;
    } else {
      const diff =
        Math.abs(
          a.handicap.number -
          b.handicap.number
        );

      if (diff === 1) {
        score += 3;
      } else if (
        diff === 2
      ) {
        score += 1;
      }
    }

    return {
      score:
        Math.min(
          30,
          Math.round(
            score * 10
          ) / 10
        ),

      reason:
        'HANDICAP_RESMI_PUAN_BANDI',

      bandA,
      bandB,

      overlap:
        Math.round(
          overlap * 1000
        ) / 1000
    };
  }

  /*
    Aynı isim tam eşleşme.
  */

  const exactA =
    normalizeLetters(
      normalizeClass(
        targetClass
      )
    );

  const exactB =
    normalizeLetters(
      normalizeClass(
        pastClass
      )
    );

  if (
    exactA ===
    exactB
  ) {
    return {
      score: 30,
      reason:
        'SINIF_TAM_ESLESME'
    };
  }

  /*
    Aynı yarış ailesindeki
    seviye farkı.
  */

  if (
    a.level !== null &&
    b.level !== null
  ) {
    const diff =
      Math.abs(
        a.level -
        b.level
      );

    if (diff === 0) {
      return {
        score: 27,
        reason:
          'AYNI_SINIF_ALT_SART_FARKLI'
      };
    }

    if (diff === 1) {
      return {
        score: 22,
        reason:
          'SINIF_BIR_KADEME_FARK'
      };
    }

    if (diff === 2) {
      return {
        score: 15,
        reason:
          'SINIF_IKI_KADEME_FARK'
      };
    }
  }

  return {
    score: 8,
    reason:
      'AYNI_KOSU_AILESI'
  };
}

/* =========================================================
   ÖZEL ŞARTLAR - 5 PUAN
========================================================= */

function extractSpecials(
  value = ''
) {
  const t =
    normalizeLetters(value);

  return {
    female:
      /DİŞİ/.test(t),

    male:
      /\/E\b|ERKEK/.test(t),

    dhow:
      /DHÖW/.test(t),

    dho:
      /DHÖ(?!W)/.test(t),

    dht:
      /DHT/.test(t),

    dh:
      /(?:^|\/)DH(?:\/|$)/.test(t),

    tr:
      /(?:^|\/)TR(?:\/|$)/.test(t),

    x1:
      /X-1/.test(t),

    x:
      /(?:^|\/)X(?:\/|$)/.test(t),

    yamak:
      /Y-[0123]/.test(t),

    amateur:
      /AMATÖR/.test(t),

    sale:
      /SATIŞ|SATIS/.test(t)
  };
}

function specialScore(
  targetClass,
  pastClass
) {
  const a =
    extractSpecials(
      targetClass
    );

  const b =
    extractSpecials(
      pastClass
    );

  const keys =
    Object.keys(a);

  let relevant = 0;
  let equal = 0;

  for (
    const key of keys
  ) {
    if (
      a[key] ||
      b[key]
    ) {
      relevant++;

      if (
        a[key] ===
        b[key]
      ) {
        equal++;
      }
    }
  }

  if (
    relevant === 0
  ) {
    return {
      score: 5,
      matched: 0,
      relevant: 0
    };
  }

  return {
    score:
      Math.round(
        (
          equal /
          relevant *
          5
        ) * 10
      ) / 10,

    matched:
      equal,

    relevant
  };
}

/* =========================================================
   MESAFE - 15 PUAN
========================================================= */

function distanceScore(
  targetDistance,
  pastDistance
) {
  const diff =
    Math.abs(
      Number(
        targetDistance
      ) -
      Number(
        pastDistance
      )
    );

  if (diff === 0) {
    return {
      score: 15,
      diff
    };
  }

  if (diff <= 100) {
    return {
      score: 12,
      diff
    };
  }

  if (diff <= 200) {
    return {
      score: 8,
      diff
    };
  }

  if (diff <= 300) {
    return {
      score: 4,
      diff
    };
  }

  return {
    score: 0,
    diff
  };
}

/* =========================================================
   HİPODROM KADEMESİ - 10 PUAN
========================================================= */

function cityTier(
  city = ''
) {
  return (
    TRACK_TIERS[
      upper(city)
    ] || null
  );
}

function cityScore(
  targetCity,
  pastCity
) {
  if (
    upper(targetCity) ===
    upper(pastCity)
  ) {
    return {
      score: 10,
      relation:
        'AYNI_HIPODROM'
    };
  }

  const a =
    cityTier(
      targetCity
    );

  const b =
    cityTier(
      pastCity
    );

  if (
    a &&
    b &&
    a === b
  ) {
    return {
      score: 7,
      relation:
        'AYNI_KADEME'
    };
  }

  if (
    a &&
    b
  ) {
    return {
      score: 3,
      relation:
        'FARKLI_KADEME'
    };
  }

  return {
    score: 2,
    relation:
      'KADEME_BILINMIYOR'
  };
}

/* =========================================================
   PİST - 15 PUAN
========================================================= */

function trackScore(
  targetTrack,
  pastTrack
) {
  if (
    normalizeTrack(
      targetTrack
    ) ===
    normalizeTrack(
      pastTrack
    )
  ) {
    return 15;
  }

  return 0;
}

/* =========================================================
   HANDİKAP/SIKLET YAPISI - 5 PUAN
========================================================= */

function weightStructureScore(
  targetClass,
  pastClass
) {
  const a =
    parseHandicap(
      targetClass
    );

  const b =
    parseHandicap(
      pastClass
    );

  if (
    !a &&
    !b
  ) {
    return 5;
  }

  if (
    !a ||
    !b
  ) {
    return 0;
  }

  const bandA =
    handicapBand(a);

  const bandB =
    handicapBand(b);

  const overlap =
    bandOverlap(
      bandA,
      bandB
    );

  return (
    Math.round(
      overlap *
      5 *
      10
    ) / 10
  );
}

/* =========================================================
   TOPLAM BENZERLİK
========================================================= */

function similarityScore(
  target,
  past
) {
  /*
    Look-ahead kesinlikle yok.
  */

  if (
    !past.isoDate ||
    past.isoDate >=
      target.date
  ) {
    return null;
  }

  const cls =
    classScore(
      target.class,
      past.class
    );

  /*
    Tamamen farklı yarış ailesini
    kabul etmiyoruz.
  */

  if (
    cls.score <= 0
  ) {
    return null;
  }

  const age =
    ageGroupScore(
      target.ageGroup,
      past.ageGroup
    );

  /*
    Arap-İngiliz veya yaş kümesi
    tamamen kopuksa alma.
  */

  if (
    age <= 0
  ) {
    return null;
  }

  const trk =
    trackScore(
      target.track,
      past.track
    );

  /*
    V6'da farklı pist çekirdek
    benzer kabul edilmiyor.
  */

  if (
    trk <= 0
  ) {
    return null;
  }

  const dst =
    distanceScore(
      target.distance,
      past.distance
    );

  if (
    dst.score <= 0
  ) {
    return null;
  }

  const city =
    cityScore(
      target.city,
      past.city
    );

  const weight =
    weightStructureScore(
      target.class,
      past.class
    );

  const special =
    specialScore(
      target.class,
      past.class
    );

  /*
    TOPLAM = 100

    Sınıf                30
    Yaş                  20
    Pist                 15
    Mesafe               15
    Hipodrom/kademe      10
    Sıklet yapısı         5
    Özel şart             5
  */

  const total =
    cls.score +
    age +
    trk +
    dst.score +
    city.score +
    weight +
    special.score;

  return {
    score:
      Math.round(
        total * 10
      ) / 10,

    detail: {
      class:
        cls.score,

      ageGroup:
        age,

      track:
        trk,

      distance:
        dst.score,

      cityTier:
        city.score,

      weightStructure:
        weight,

      specialConditions:
        special.score
    },

    classDetail:
      cls,

    cityDetail:
      city,

    specialDetail:
      special,

    distanceDiff:
      dst.diff
  };
}

/* =========================================================
   TJK OPTION ÇÖZÜMÜ
========================================================= */

function optionList(
  $,
  selector
) {
  const list = [];

  $(selector)
    .find('option')
    .each((_, option) => {
      list.push({
        value:
          clean(
            $(option)
              .attr('value') ||
            ''
          ),

        text:
          clean(
            $(option).text()
          )
      });
    });

  return list;
}

function findClassOption(
  options,
  targetClass
) {
  const target =
    parseRaceFamily(
      targetClass
    );

  if (
    target.family ===
    'HANDICAP'
  ) {
    return (
      options.find(
        x => {
          const f =
            parseRaceFamily(
              x.text
            );

          return (
            f.family ===
              'HANDICAP' &&
            f.level ===
              target.level
          );
        }
      ) || null
    );
  }

  return (
    options.find(
      x => {
        const f =
          parseRaceFamily(
            x.text
          );

        return (
          f.family ===
            target.family &&
          f.level ===
            target.level
        );
      }
    ) || null
  );
}

function findTrackOption(
  options,
  targetTrack
) {
  return (
    options.find(
      x =>
        normalizeTrack(
          x.text
        ) ===
        normalizeTrack(
          targetTrack
        )
    ) || null
  );
}

async function fetchHtml(url) {
  const response =
    await fetch(
      url,
      {
        headers:
          HEADERS,

        redirect:
          'follow'
      }
    );

  if (!response.ok) {
    throw new Error(
      `TJK GET HTTP ${response.status}`
    );
  }

  return await response.text();
}

async function resolveFilters(
  target
) {
  const html =
    await fetchHtml(
      PAGE_URL
    );

  const $ =
    cheerio.load(html);

  const classes =
    optionList(
      $,
      '#QueryParameter_KosuCinsiId'
    );

  const tracks =
    optionList(
      $,
      '#QueryParameter_PistId'
    );

  return {
    raceClass:
      findClassOption(
        classes,
        target.class
      ),

    track:
      findTrackOption(
        tracks,
        target.track
      )
  };
}

/* =========================================================
   POST
========================================================= */

async function postForm(
  url,
  data
) {
  const body =
    new URLSearchParams();

  for (
    const [key, value] of
    Object.entries(data)
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      continue;
    }

    body.set(
      key,
      String(value)
    );
  }

  const response =
    await fetch(
      url,
      {
        method:
          'POST',

        headers: {
          ...HEADERS,

          'content-type':
            'application/x-www-form-urlencoded; charset=UTF-8',

          'x-requested-with':
            'XMLHttpRequest'
        },

        body:
          body.toString(),

        redirect:
          'follow'
      }
    );

  if (!response.ok) {
    throw new Error(
      `TJK POST HTTP ${response.status}`
    );
  }

  return await response.text();
}

/* =========================================================
   TABLO PARSER
========================================================= */

function getHeaders(
  $,
  table
) {
  const headers = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      headers.push(
        clean(
          $(th).text()
        )
      );
    });

  return headers;
}

function findHeader(
  headers,
  re
) {
  return headers.findIndex(
    x =>
      re.test(
        clean(x)
      )
  );
}

function parseQueryTable(
  html
) {
  const $ =
    cheerio.load(html);

  const rows = [];

  $('table').each(
    (_, table) => {

      const headers =
        getHeaders(
          $,
          table
        );

      const dateIx =
        findHeader(
          headers,
          /^Tarih$/i
        );

      const cityIx =
        findHeader(
          headers,
          /^Şehir$|^Sehir$/i
        );

      const raceIx =
        findHeader(
          headers,
          /^Koşu$|^Kosu$/i
        );

      const ageIx =
        findHeader(
          headers,
          /^Grup$/i
        );

      const classIx =
        findHeader(
          headers,
          /Koşu Cinsi|Kosu Cinsi/i
        );

      const distanceIx =
        findHeader(
          headers,
          /^Mesafe$/i
        );

      const trackIx =
        findHeader(
          headers,
          /^Pist$/i
        );

      if (
        dateIx < 0 ||
        cityIx < 0 ||
        raceIx < 0 ||
        ageIx < 0 ||
        classIx < 0 ||
        distanceIx < 0 ||
        trackIx < 0
      ) {
        return;
      }

      $(table)
        .find('tbody tr')
        .each(
          (_, tr) => {

            const cells =
              $(tr)
                .find('td')
                .map(
                  (__, td) =>
                    clean(
                      $(td).text()
                    )
                )
                .get();

            const pd =
              parseDate(
                cells[
                  dateIx
                ]
              );

            if (!pd) {
              return;
            }

            const raceNo =
              Number(
                String(
                  cells[
                    raceIx
                  ] || ''
                ).match(
                  /\d+/
                )?.[0] ||
                0
              );

            const distance =
              Number(
                String(
                  cells[
                    distanceIx
                  ] || ''
                ).match(
                  /\d{3,4}/
                )?.[0] ||
                0
              );

            rows.push({
              date:
                pd.display,

              isoDate:
                pd.iso,

              city:
                clean(
                  cells[
                    cityIx
                  ]
                ),

              raceNo,

              ageGroup:
                clean(
                  cells[
                    ageIx
                  ]
                ),

              class:
                normalizeClass(
                  cells[
                    classIx
                  ]
                ),

              distance,

              track:
                normalizeTrack(
                  cells[
                    trackIx
                  ]
                )
            });
          }
        );
    }
  );

  return rows;
}

function parseRowsFragment(
  html
) {
  let rows =
    parseQueryTable(
      html
    );

  if (
    rows.length
  ) {
    return rows;
  }

  const wrapped =
    `
    <table>
      <thead>
        <tr>
          <th>Tarih</th>
          <th>Şehir</th>
          <th>Koşu</th>
          <th>Grup</th>
          <th>Koşu Cinsi</th>
          <th>Mesafe</th>
          <th>Pist</th>
        </tr>
      </thead>
      <tbody>
        ${html}
      </tbody>
    </table>
    `;

  return parseQueryTable(
    wrapped
  );
}

function rowKey(r) {
  return [
    r.isoDate,
    upper(r.city),
    r.raceNo,
    upper(r.class),
    upper(r.ageGroup),
    r.distance,
    upper(r.track)
  ].join('|');
}

/* =========================================================
   FORM
========================================================= */

function buildQueryForm(
  target,
  filters
) {
  return {
    QueryParameter_Tarih_Start:
      '',

    QueryParameter_Tarih_End:
      isoToDisplay(
        target.date
      ),

    QueryParameter_SehirId:
      '',

    QueryParameter_IrkId:
      '',

    /*
      V6:
      yaş grubunu TJK'de
      filtrelemiyoruz.

      3İ ↔ 3+İ gibi
      kısmi benzerlikler
      local scoring'de
      değerlendirilecek.
    */

    QueryParameter_GrupId:
      '',

    /*
      Koşu sınıfının ana TJK
      kategorisini filtreliyoruz.
      Örn Handikap 16.

      H1/H2/H3 ayrımı local
      resmi bant hesabıyla yapılır.
    */

    QueryParameter_KosuCinsiId:
      filters.raceClass
        ?.value || '',

    QueryParameter_Cinsiyet:
      '',

    QueryParameter_APRANTIKODU:
      '',

    QueryParameter_Mesafe:
      '',

    QueryParameter_PistId:
      filters.track
        ?.value || '',

    QueryParameter_BabaAdi:
      '',

    QueryParameter_AnneAdi:
      '',

    Era:
      'past',

    Sort:
      SORT
  };
}

/* =========================================================
   TJK SAYFALAMA
========================================================= */

async function fetchFirstPage(
  form
) {
  const html =
    await postForm(
      DATA_URL,
      form
    );

  return parseQueryTable(
    html
  );
}

async function fetchMorePage(
  pageNumber,
  baseForm
) {
  /*
    V5'ten fark:
    Sayfa 2+ isteklerinde
    filtreleri de tekrar gönderiyoruz.

    Böylece filtresiz global
    listeye düşme riskini azaltıyoruz.
  */

  const form = {
    ...baseForm,

    PageNumber:
      pageNumber,

    Sort:
      SORT
  };

  const html =
    await postForm(
      ROWS_URL,
      form
    );

  return parseRowsFragment(
    html
  );
}

/* =========================================================
   TARİHSEL TARAMA
========================================================= */

async function scanHistorical({
  target,
  filters,
  limit,
  maxPages
}) {
  const form =
    buildQueryForm(
      target,
      filters
    );

  const seen =
    new Set();

  const rows = [];
  const matches = [];
  const diagnostics = [];

  function consume(
    incoming
  ) {
    let added = 0;
    let found = 0;

    for (
      const row of incoming
    ) {
      const key =
        rowKey(row);

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      if (
        row.isoDate >=
        target.date
      ) {
        continue;
      }

      rows.push(row);
      added++;

      const sim =
        similarityScore(
          target,
          row
        );

      if (!sim) {
        continue;
      }

      matches.push({
        date:
          row.isoDate,

        dateDisplay:
          row.date,

        city:
          row.city,

        raceNo:
          row.raceNo,

        class:
          row.class,

        ageGroup:
          row.ageGroup,

        distance:
          row.distance,

        track:
          row.track,

        similarity:
          sim.score,

        distanceDiff:
          sim.distanceDiff,

        similarityDetail:
          sim.detail,

        classDetail:
          sim.classDetail,

        cityDetail:
          sim.cityDetail,

        specialDetail:
          sim.specialDetail
      });

      found++;
    }

    return {
      added,
      found
    };
  }

  const first =
    await fetchFirstPage(
      form
    );

  const firstResult =
    consume(first);

  diagnostics.push({
    page: 1,

    rows:
      first.length,

    newRows:
      firstResult.added,

    newMatches:
      firstResult.found,

    totalMatches:
      matches.length,

    status:
      first.length
        ? 'TAMAM'
        : 'BOS'
  });

  if (!first.length) {
    return {
      rows,
      matches,
      diagnostics
    };
  }

  /*
    Daha geniş aday havuzu.
  */

  const wantedMatches =
    Math.max(
      limit * 4,
      30
    );

  for (
    let page = 2;
    page <= maxPages;
    page++
  ) {
    const incoming =
      await fetchMorePage(
        page,
        form
      );

    if (
      !incoming.length
    ) {
      diagnostics.push({
        page,
        rows: 0,
        status:
          'BOS'
      });

      break;
    }

    const before =
      rows.length;

    const result =
      consume(
        incoming
      );

    diagnostics.push({
      page,

      rows:
        incoming.length,

      newRows:
        result.added,

      newMatches:
        result.found,

      totalRows:
        rows.length,

      totalMatches:
        matches.length,

      status:
        result.added
          ? 'TAMAM'
          : 'TEKRAR'
    });

    if (
      rows.length ===
      before
    ) {
      break;
    }

    if (
      matches.length >=
      wantedMatches
    ) {
      break;
    }
  }

  return {
    rows,
    matches,
    diagnostics
  };
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {
  try {

    const date =
      clean(
        req.query.date ||
        ''
      );

    const city =
      clean(
        req.query.city ||
        ''
      );

    const raceClass =
      clean(
        req.query.class ||
        ''
      );

    const ageGroup =
      clean(
        req.query.ageGroup ||
        ''
      );

    const track =
      clean(
        req.query.track ||
        ''
      );

    const distance =
      Number(
        req.query.distance ||
        0
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            req.query.limit ||
            10
          ),
          1
        ),
        30
      );

    const maxPages =
      Math.min(
        Math.max(
          Number(
            req.query.maxPages ||
            30
          ),
          1
        ),
        80
      );

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'date YYYY-MM-DD biçiminde gerekli.'
        });
    }

    if (!raceClass) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'class gerekli.'
        });
    }

    if (!ageGroup) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'ageGroup gerekli.'
        });
    }

    if (!track) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'track gerekli.'
        });
    }

    if (
      !Number.isFinite(
        distance
      ) ||
      distance <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'distance gerekli.'
        });
    }

    const target = {
      date,
      city,

      class:
        raceClass,

      ageGroup,

      track:
        normalizeTrack(
          track
        ),

      distance
    };

    const filters =
      await resolveFilters(
        target
      );

    if (
      !filters.raceClass
    ) {
      throw new Error(
        `TJK Koşu Cinsi bulunamadı: ${raceClass}`
      );
    }

    if (
      !filters.track
    ) {
      throw new Error(
        `TJK Pist filtresi bulunamadı: ${track}`
      );
    }

    const scan =
      await scanHistorical({
        target,
        filters,
        limit,
        maxPages
      });

    scan.matches.sort(
      (a, b) => {

        if (
          b.similarity !==
          a.similarity
        ) {
          return (
            b.similarity -
            a.similarity
          );
        }

        return (
          b.date.localeCompare(
            a.date
          )
        );
      }
    );

    const selected =
      scan.matches.slice(
        0,
        limit
      );

    const dates =
      scan.rows
        .map(
          x =>
            x.isoDate
        )
        .filter(Boolean)
        .sort();

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res
      .status(200)
      .json({

        ok: true,

        version:
          'TJK-SIMILAR-V6',

        target,

        resolvedFilters: {
          raceClass:
            filters.raceClass,

          track:
            filters.track
        },

        scoring: {
          class:
            30,

          ageGroup:
            20,

          track:
            15,

          distance:
            15,

          cityTier:
            10,

          weightStructure:
            5,

          specialConditions:
            5,

          total:
            100
        },

        officialRulesUsed: {
          handicapBands:
            '2026 Genel Hükümler Madde/Tablo 28',

          handicapPointToWeight:
            '1 puan = 0.5 kg',

          trackTiers:
            '2026 Genel Hükümler sayfa 29',

          tiers: {
            1:
              [
                'İstanbul',
                'Ankara'
              ],

            2:
              [
                'Adana',
                'İzmir',
                'Bursa',
                'Antalya',
                'Kocaeli'
              ],

            3:
              [
                'Şanlıurfa',
                'Elazığ',
                'Diyarbakır'
              ]
          }
        },

        pagesRead:
          scan.diagnostics
            .filter(
              x =>
                x.status ===
                'TAMAM'
            )
            .length,

        scanned:
          scan.rows.length,

        oldestDate:
          dates.length
            ? dates[0]
            : null,

        newestDate:
          dates.length
            ? dates[
                dates.length - 1
              ]
            : null,

        matchCount:
          scan.matches.length,

        returned:
          selected.length,

        diagnostics:
          scan.diagnostics,

        matches:
          selected,

        source:
          'TJK_OFFICIAL_RULE_BASED_SIMILARITY_V6'
      });

  } catch (e) {

    console.error(
      'tjk-similar V6:',
      e
    );

    return res
      .status(500)
      .json({

        ok: false,

        version:
          'TJK-SIMILAR-V6',

        error:
          e?.message ||
          'Tarihsel benzerlik hesaplanamadı.'
      });
  }
    }
