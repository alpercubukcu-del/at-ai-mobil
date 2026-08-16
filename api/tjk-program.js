import * as cheerio from 'cheerio';

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8'
};

function trDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function norm(s = '') {
  return s.replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  try {
    const date = String(
      req.query.date || new Date().toISOString().slice(0, 10)
    );

    const base =
      `https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisProgrami` +
      `?QueryParameter_Tarih=${encodeURIComponent(trDate(date))}`;

    const r = await fetch(base, { headers: HEADERS });

    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: 'TJK ana program erişimi başarısız' });
    }

    const html = await r.text();
    const $ = cheerio.load(html);

    const cities = [];

    $('a[href*="GunlukYarisProgrami"]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const m = href.match(/SehirId=(\d+)/i);
      if (!m) return;

      const name = norm($(a).text());
      if (!name) return;

      if (!cities.some(c => c.id === m[1])) {
        cities.push({
          id: m[1],
          name,
          href: new URL(href, 'https://www.tjk.org').href
        });
      }
    });

    const racesByCity = {};

    for (const city of cities.slice(0, 12)) {
      try {
        let u = city.href;

        if (!/QueryParameter_Tarih=/i.test(u)) {
          u +=
            (u.includes('?') ? '&' : '?') +
            'QueryParameter_Tarih=' +
            encodeURIComponent(trDate(date));
        }

        const cr = await fetch(u, { headers: HEADERS });
        if (!cr.ok) continue;

        const ch = await cr.text();
        const c$ = cheerio.load(ch);
        const races = [];

        c$('table').each((_, table) => {
          const text = norm(
            c$(table)
              .prevAll('h3,h4,.race-title,.title')
              .first()
              .text() +
              ' ' +
              c$(table).parent().text().slice(0, 300)
          );

          const rm = text.match(/(\d+)\.\s*Koşu/i);
          if (!rm) return;

          const no = Number(rm[1]);

          let race = races.find(x => x.no === no);

          if (!race) {
            const dm = text.match(/(\d{3,4})\s*(Çim|Kum|Sentetik)/i);

            race = {
              no,
              time: (text.match(/\b\d{1,2}\.\d{2}\b/) || [])[0] || '',
              class:
                (
                  text.match(
                    /(Maiden|Handikap\s*\d+|Şartlı\s*\d+|KV-\d+|G\d|A\d)/i
                  ) || []
                )[0] || '',
              distance: dm ? dm[1] + 'm' : '',
              track: dm ? dm[2] : '',
              betStarts: [],
              horses: []
            };

            races.push(race);
          }

          c$(table)
            .find('tbody tr')
            .each((_, tr) => {
              const cells = c$(tr)
                .find('td')
                .map((__, td) => norm(c$(td).text()))
                .get();

              if (cells.length < 4) return;

              const n = Number(cells[0]);
              if (!Number.isFinite(n) || n <= 0) return;

              const link =
                c$(tr)
                  .find(
                    'a[href*="AtKosuBilgileri"],a[href*="AtId"]'
                  )
                  .first()
                  .attr('href') || '';

              const id =
                (
                  link.match(/AtId=(\d+)/i) ||
                  link.match(/QueryParameter_AtId=(\d+)/i) ||
                  []
                )[1] || '';

              race.horses.push({
                no: n,
                name: cells[1] || '',
                id,
                jockey: cells[5] || cells[4] || '',
                hp: cells.find(x => /^\d{1,3}$/.test(x)) || '',
                odds:
                  cells.find(x => /^\d+[,.]\d+$/.test(x)) || ''
              });
            });
        });

        racesByCity[city.id] = races.sort((a, b) => a.no - b.no);
      } catch {}
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=600'
    );

    return res.status(200).json({
      date,
      cities,
      racesByCity
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
    }
