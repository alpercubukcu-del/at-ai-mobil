import * as cheerio from 'cheerio';

const TJK = 'https://www.tjk.org';

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':
    'tr-TR,tr;q=0.9,en;q=0.7',
  referer:
    'https://www.tjk.org/'
};

function clean(v = '') {
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isoToDisplay(iso = '') {
  const m = String(iso).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!m) return '';

  return `${m[3]}/${m[2]}/${m[1]}`;
}

function normalizeTrack(value = '') {
  const t =
    clean(value)
      .toLocaleUpperCase('tr-TR');

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

  if (
    t.includes('SENTETİK')
  ) {
    return 'Sentetik';
  }

  return '';
}

async function fetchHtml(url) {
  const response =
    await fetch(url, {
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

function getHeaders($, table) {
  let headers = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      headers.push(
        clean($(th).text())
      );
    });

  if (!headers.length) {
    $(table)
      .find('tr')
      .first()
      .find('th,td')
      .each((_, el) => {
        headers.push(
          clean($(el).text())
        );
      });
  }

  return headers;
}

function findHeader(headers, re) {
  return headers.findIndex(
    x =>
      re.test(
        clean(x)
      )
  );
}

/* =========================================================
   ŞEHİR SONUÇ URL'SİNİ BUL
========================================================= */

async function findCityResultUrl(
  dateIso,
  cityName
) {
  const display =
    isoToDisplay(dateIso);

  if (!display) {
    throw new Error(
      'Geçersiz tarih.'
    );
  }

  const mainUrl =
    `${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari` +
    `?QueryParameter_Tarih=${encodeURIComponent(display)}`;

  const html =
    await fetchHtml(
      mainUrl
    );

  const $ =
    cheerio.load(
      html
    );

  const target =
    clean(cityName)
      .toLocaleUpperCase('tr-TR');

  let found = '';

  $('a').each((_, a) => {
    if (found) return;

    const text =
      clean($(a).text())
        .toLocaleUpperCase('tr-TR');

    const href =
      $(a).attr('href') || '';

    if (
      !href.includes(
        'GunlukYarisSonuclari'
      )
    ) {
      return;
    }

    /*
      Örnek:
      İzmir (36. Y.G.)
      Elazığ (29. Y.G.)
    */
    if (
      text.startsWith(
        target
      )
    ) {
      found =
        new URL(
          href,
          TJK
        ).toString();
    }
  });

  if (!found) {
    throw new Error(
      `${cityName} için ${dateIso} tarihli TJK yarış sonucu bulunamadı.`
    );
  }

  return found;
}

/* =========================================================
   KOŞU BAŞLIĞI
========================================================= */

function parseCondition(
  value = ''
) {
  const text =
    clean(value);

  const parts =
    text
      .split(',')
      .map(clean)
      .filter(Boolean);

  /*
    Örnek:
    Handikap 16 /H3 ,
    3 Yaşlı İngilizler,
    2000 Kum ,
    E.İ.D...
  */

  const raceClass =
    parts[0] || '';

  const ageGroup =
    parts[1] || '';

  const distanceMatch =
    text.match(
      /\b(\d{3,4})\s+(?:Çim|Kum|Sentetik)\b/i
    );

  const distance =
    distanceMatch
      ? `${distanceMatch[1]}m`
      : '';

  const track =
    normalizeTrack(
      text
    );

  return {
    class:
      raceClass,

    ageGroup,

    distance,

    track,

    raw:
      text
  };
}

/* =========================================================
   AT BİLGİSİ
========================================================= */

function parseHorseCell(
  $,
  cell
) {
  const text =
    clean(
      $(cell).text()
    );

  /*
    Örnek:
    BERMEDEE(7) KG ...
  */

  const firstLink =
    $(cell)
      .find('a')
      .first();

  const linkText =
    clean(
      firstLink.text()
    );

  const horseText =
    linkText || text;

  const programNoMatch =
    horseText.match(
      /\((\d+)\)/
    );

  const programNo =
    programNoMatch
      ? Number(
          programNoMatch[1]
        )
      : null;

  let name =
    horseText
      .replace(
        /\(\d+\).*$/,
        ''
      )
      .trim();

  /*
    Eğer link metni boşsa
    hücredeki ekipman açıklamalarını
    olabildiğince kes.
  */
  if (!linkText) {
    name =
      name
        .replace(
          /\s+(KG|K|DB|SK|SKG|YP|ÖG|GKR|BB).*$/i,
          ''
        )
        .trim();
  }

  let horseId = '';

  $(cell)
    .find('a')
    .each((_, a) => {
      if (horseId) return;

      const href =
        $(a).attr('href') || '';

      const m =
        href.match(
          /QueryParameter_AtId=(-?\d+)/i
        );

      if (m) {
        horseId =
          String(m[1])
            .replace(
              /[^\d]/g,
              ''
            );
      }
    });

  return {
    id:
      horseId,

    name,

    programNo
  };
}

/* =========================================================
   SONUÇ SAYFASINI PARSE ET
========================================================= */

function parseResultPage(
  html,
  requestedRaceNo
) {
  const $ =
    cheerio.load(
      html
    );

  let activeRaceNo = null;

  let activeCondition = '';

  let result = null;

  /*
    h3 ve table elemanlarını
    sayfadaki gerçek sıralarıyla
    geziyoruz.
  */
  $('h3, table').each(
    (_, el) => {
      if (result) return;

      const tag =
        String(
          el.tagName ||
          el.name ||
          ''
        ).toLowerCase();

      if (tag === 'h3') {
        const text =
          clean(
            $(el).text()
          );

        const raceMatch =
          text.match(
            /^(\d+)\.\s*Koşu\b/i
          );

        if (raceMatch) {
          activeRaceNo =
            Number(
              raceMatch[1]
            );

          activeCondition = '';

          return;
        }

        /*
          Aktif yarıştan sonraki
          ilk uygun h3 yarış şartıdır.
        */
        if (
          activeRaceNo &&
          !activeCondition &&
          /(?:Kum|Çim|Sentetik)/i.test(
            text
          )
        ) {
          activeCondition =
            text;
        }

        return;
      }

      if (
        tag !== 'table' ||
        !activeRaceNo
      ) {
        return;
      }

      if (
        Number(
          activeRaceNo
        ) !==
        Number(
          requestedRaceNo
        )
      ) {
        return;
      }

      const headers =
        getHeaders(
          $,
          el
        );

      const finishIx =
        findHeader(
          headers,
          /^S$/i
        );

      const horseIx =
        findHeader(
          headers,
          /At İsmi|At Ismi/i
        );

      if (
        finishIx < 0 ||
        horseIx < 0
      ) {
        return;
      }

      const top3 = [];

      $(el)
        .find('tbody tr')
        .each((_, tr) => {
          const cells =
            $(tr)
              .find('td')
              .toArray();

          if (
            cells.length <=
            Math.max(
              finishIx,
              horseIx
            )
          ) {
            return;
          }

          const finishText =
            clean(
              $(cells[finishIx])
                .text()
            );

          const finishMatch =
            finishText.match(
              /\d+/
            );

          if (!finishMatch) {
            return;
          }

          const finish =
            Number(
              finishMatch[0]
            );

          if (
            finish < 1 ||
            finish > 3
          ) {
            return;
          }

          const horse =
            parseHorseCell(
              $,
              cells[horseIx]
            );

          top3.push({
            finish,
            horseId:
              horse.id,

            horseName:
              horse.name,

            programNo:
              horse.programNo
          });
        });

      if (
        top3.length
      ) {
        top3.sort(
          (a, b) =>
            a.finish -
            b.finish
        );

        result = {
          raceNo:
            activeRaceNo,

          condition:
            parseCondition(
              activeCondition
            ),

          top3
        };
      }
    }
  );

  return result;
}

/* =========================================================
   ANA HANDLER
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

    const raceNo =
      Number(
        req.query.raceNo ||
        0
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

    if (!city) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'city gerekli.'
        });
    }

    if (
      !Number.isInteger(
        raceNo
      ) ||
      raceNo < 1
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'raceNo gerekli.'
        });
    }

    /*
      Önce o tarih ve şehir için
      gerçek TJK sonuç sayfasını bul.
    */
    const resultUrl =
      await findCityResultUrl(
        date,
        city
      );

    const html =
      await fetchHtml(
        resultUrl
      );

    const race =
      parseResultPage(
        html,
        raceNo
      );

    if (!race) {
      return res
        .status(404)
        .json({
          ok: false,

          error:
            `${date} ${city} ${raceNo}. koşu sonucu bulunamadı.`,

          resultUrl
        });
    }

    const missingHorseIds =
      race.top3.filter(
        x =>
          !x.horseId
      ).length;

    res.setHeader(
      'Cache-Control',
      's-maxage=3600, stale-while-revalidate=86400'
    );

    return res
      .status(200)
      .json({
        ok: true,

        version:
          'TJK-HISTORY-V1',

        date,

        city,

        raceNo,

        class:
          race.condition.class,

        ageGroup:
          race.condition.ageGroup,

        distance:
          race.condition.distance,

        track:
          race.condition.track,

        conditionRaw:
          race.condition.raw,

        top3:
          race.top3,

        top3Count:
          race.top3.length,

        horseIdsComplete:
          missingHorseIds === 0,

        missingHorseIds,

        source:
          'TJK_GUNLUK_YARIS_SONUCLARI'
      });

  } catch (e) {
    console.error(
      'tjk-history:',
      e
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          e?.message ||
          'Tarihsel yarış sonucu alınamadı.'
      });
  }
}
