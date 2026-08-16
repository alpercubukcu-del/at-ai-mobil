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

function parseDate(value = '') {
  const m = clean(value).match(
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

function displayFromIso(iso = '') {
  const m =
    String(iso).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!m) return '';

  return `${m[3]}.${m[2]}.${m[1]}`;
}

function normalizeTrack(value = '') {
  const t =
    clean(value)
      .toLocaleUpperCase('tr-TR');

  /*
    Kariyer tablosunda:
    K:Normal
    K:Islak
    K:Sulu
    Ç:Normal
    S:Normal
    biçimleri gelebiliyor.
  */

  if (
    t.startsWith('Ç') ||
    t.includes('ÇİM')
  ) {
    return 'Çim';
  }

  if (
    t.startsWith('K') ||
    t.includes('KUM')
  ) {
    return 'Kum';
  }

  if (
    t.startsWith('S') ||
    t.includes('SENTETİK')
  ) {
    return 'Sentetik';
  }

  return clean(value);
}

/* =========================================================
   GRUP KODU -> OKUNABİLİR YAŞ GRUBU

   TJK örnekleri:
   2İ   = 2 Yaşlı İngilizler
   3İ   = 3 Yaşlı İngilizler
   3+İ  = 3 ve Yukarı İngilizler
   4+İ  = 4 ve Yukarı İngilizler

   2A   = 2 Yaşlı Araplar
   3A   = 3 Yaşlı Araplar
   4A   = 4 Yaşlı Araplar
   4+A  = 4 ve Yukarı Araplar
========================================================= */

function normalizeAgeGroup(value = '') {
  let raw =
    clean(value);

  if (!raw) return '';

  /*
    Görsel / dipnot gibi ekleri kaldır.
  */
  raw =
    raw
      .replace(/\s+/g, '')
      .toLocaleUpperCase(
        'tr-TR'
      );

  /*
    Zaten uzun açıklama geldiyse
    aynen kullan.
  */
  if (
    /YAŞLI|YUKARI/i.test(
      clean(value)
    )
  ) {
    return clean(value);
  }

  /*
    İngilizler
  */
  let m =
    raw.match(
      /^(\d+)\+İ$/
    );

  if (m) {
    return `${m[1]} ve Yukarı İngilizler`;
  }

  m =
    raw.match(
      /^(\d+)İ$/
    );

  if (m) {
    return `${m[1]} Yaşlı İngilizler`;
  }

  /*
    Araplar
  */
  m =
    raw.match(
      /^(\d+)\+A$/
    );

  if (m) {
    return `${m[1]} ve Yukarı Araplar`;
  }

  m =
    raw.match(
      /^(\d+)A$/
    );

  if (m) {
    return `${m[1]} Yaşlı Araplar`;
  }

  /*
    Bazı eski TJK kayıtlarında
    harf farklı sırada gelebilir.
  */

  m =
    raw.match(
      /^İ(\d+)\+$/
    );

  if (m) {
    return `${m[1]} ve Yukarı İngilizler`;
  }

  m =
    raw.match(
      /^A(\d+)\+$/
    );

  if (m) {
    return `${m[1]} ve Yukarı Araplar`;
  }

  /*
    Tanınmayan gerçek TJK Grup
    değeri varsa kaybetmiyoruz.
  */
  return clean(value);
}

function normalizeClass(value = '') {
  return clean(value)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function getHeaders(
  $,
  table
) {
  let headers = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      headers.push(
        clean(
          $(th).text()
        )
      );
    });

  if (!headers.length) {
    $(table)
      .find('tr')
      .first()
      .find('th,td')
      .each((_, el) => {
        headers.push(
          clean(
            $(el).text()
          )
        );
      });
  }

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

/* =========================================================
   KARİYER TABLOSU
========================================================= */

function parseCareerRows($) {
  const results = [];

  $('table').each(
    (_, table) => {

      const headers =
        getHeaders(
          $,
          table
        );

      /*
        TJK At Koşu Bilgileri örnek başlıkları:

        Tarih
        Şehir
        Msf
        Pist
        S
        Derece
        Sıklet
        Takı
        Jokey
        St
        Gny
        Grup
        K. No-K. Adı
        Kcins
        Ant.
        Sahip
        HP
        ...
      */

      const dateIx =
        findHeader(
          headers,
          /^Tarih$/i
        );

      const cityIx =
        findHeader(
          headers,
          /Şehir|Sehir/i
        );

      const distanceIx =
        findHeader(
          headers,
          /^Msf$|Mesafe/i
        );

      const trackIx =
        findHeader(
          headers,
          /^Pist$/i
        );

      const finishIx =
        findHeader(
          headers,
          /^S$/i
        );

      const groupIx =
        findHeader(
          headers,
          /^Grup$/i
        );

      /*
        En önemli düzeltme:
        yarış sınıfı doğrudan
        Kcins sütunundan alınacak.
      */
      const classIx =
        findHeader(
          headers,
          /^Kcins$/i
        );

      const raceNoIx =
        findHeader(
          headers,
          /K\.\s*No-K\.\s*Adı|K\.\s*No|Koşu No|Kosu No/i
        );

      if (
        dateIx < 0 ||
        finishIx < 0
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

            if (
              !cells.length
            ) {
              return;
            }

            const dateText =
              clean(
                cells[
                  dateIx
                ] || ''
              );

            const pd =
              parseDate(
                dateText
              );

            if (!pd) {
              return;
            }

            const finishText =
              String(
                cells[
                  finishIx
                ] || ''
              );

            const finishMatch =
              finishText.match(
                /\d+/
              );

            if (
              !finishMatch
            ) {
              return;
            }

            const finish =
              Number(
                finishMatch[0]
              );

            if (
              !Number.isFinite(
                finish
              ) ||
              finish < 1 ||
              finish > 99
            ) {
              return;
            }

            const distanceRaw =
              distanceIx >= 0
                ? clean(
                    cells[
                      distanceIx
                    ] || ''
                  )
                : '';

            const dm =
              distanceRaw.match(
                /\d{3,4}/
              );

            const trackRaw =
              trackIx >= 0
                ? clean(
                    cells[
                      trackIx
                    ] || ''
                  )
                : '';

            const groupRaw =
              groupIx >= 0
                ? clean(
                    cells[
                      groupIx
                    ] || ''
                  )
                : '';

            const classRaw =
              classIx >= 0
                ? clean(
                    cells[
                      classIx
                    ] || ''
                  )
                : '';

            const raceNoRaw =
              raceNoIx >= 0
                ? clean(
                    cells[
                      raceNoIx
                    ] || ''
                  )
                : '';

            const raceNo =
              raceNoRaw
                .match(/\d+/)
                ?.[0] || '';

            results.push({
              date:
                pd.display,

              isoDate:
                pd.iso,

              city:
                cityIx >= 0
                  ? clean(
                      cells[
                        cityIx
                      ] || ''
                    )
                  : '',

              finish,

              raceNo,

              distance:
                dm
                  ? `${dm[0]}m`
                  : distanceRaw,

              track:
                normalizeTrack(
                  trackRaw
                ),

              /*
                ARTIK DOĞRUDAN
                TJK SÜTUNLARINDAN.
              */

              class:
                normalizeClass(
                  classRaw
                ),

              ageGroup:
                normalizeAgeGroup(
                  groupRaw
                ),

              ageGroupRaw:
                groupRaw,

              detailSource:
                'TJK_AT_KOSU_BILGILERI'
            });
          }
        );
    }
  );

  return results;
}

/* =========================================================
   HTTP
========================================================= */

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
      `TJK HTTP ${response.status}`
    );
  }

  return await response.text();
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {
  try {

    const horseId =
      String(
        req.query.horseId ||
        ''
      ).replace(
        /\D/g,
        ''
      );

    const before =
      String(
        req.query.before ||
        ''
      ).trim();

    if (!horseId) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'horseId gerekli'
        });
    }

    if (
      before &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        before
      )
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          error:
            'before tarihi YYYY-MM-DD biçiminde olmalı.'
        });
    }

    const careerUrl =
      `${TJK}/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri` +
      `?1=1` +
      `&QueryParameter_AtId=${encodeURIComponent(
        horseId
      )}` +
      `&Era=today`;

    const html =
      await fetchHtml(
        careerUrl
      );

    const $ =
      cheerio.load(
        html
      );

    const allRows =
      parseCareerRows(
        $
      );

    /*
      SADECE İLK 5.
    */
    let top5 =
      allRows.filter(
        row =>
          row.finish >= 1 &&
          row.finish <= 5
      );

    /*
      GELECEK BİLGİSİ YOK.

      before=2023-09-15
      ise 15.09.2023 dahil
      kullanılmayacak.
    */
    if (before) {
      top5 =
        top5.filter(
          row =>
            row.isoDate &&
            row.isoDate <
              before
        );
    }

    /*
      Kariyer yol haritası:
      eskiden yeniye.
    */
    top5.sort(
      (a, b) =>
        a.isoDate.localeCompare(
          b.isoDate
        )
    );

    const finishCounts = {
      first:
        top5.filter(
          x =>
            x.finish === 1
        ).length,

      second:
        top5.filter(
          x =>
            x.finish === 2
        ).length,

      third:
        top5.filter(
          x =>
            x.finish === 3
        ).length,

      fourth:
        top5.filter(
          x =>
            x.finish === 4
        ).length,

      fifth:
        top5.filter(
          x =>
            x.finish === 5
        ).length
    };

    const ageGroupFilled =
      top5.filter(
        x =>
          !!x.ageGroup
      ).length;

    const classFilled =
      top5.filter(
        x =>
          !!x.class
      ).length;

    /*
      Bu API artık tek TJK
      isteği yaptığı için önceki
      V5'e göre çok daha hızlıdır.
    */

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res
      .status(200)
      .json({

        ok: true,

        version:
          'CAREER-ROADMAP-V6',

        horseId,

        before:
          before || null,

        beforeDisplay:
          before
            ? displayFromIso(
                before
              )
            : null,

        cutoffExclusive:
          true,

        rule:
          'SADECE_ILK_5',

        detailRule:
          'TJK_AT_KOSU_BILGILERI_DOGRUDAN',

        /*
          Tanı testi.
        */

        detectedColumns: {
          group:
            allRows.some(
              x =>
                !!x.ageGroupRaw
            ),

          raceClass:
            allRows.some(
              x =>
                !!x.class
            ),

          raceNo:
            allRows.some(
              x =>
                !!x.raceNo
            )
        },

        totalCareerRowsRead:
          allRows.length,

        top5Count:
          top5.length,

        ageGroupFilled,

        ageGroupMissing:
          top5.length -
          ageGroupFilled,

        classFilled,

        classMissing:
          top5.length -
          classFilled,

        finishCounts,

        roadmap:
          top5,

        /*
          app.js eski uyumluluk
        */
        top5
      });

  } catch (e) {

    console.error(
      'tjk-career:',
      e
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          e?.message ||
          'Kariyer yol haritası oluşturulamadı.'
      });
  }
        }
