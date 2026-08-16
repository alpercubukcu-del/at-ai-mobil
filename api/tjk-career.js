import * as cheerio from 'cheerio';

const H = {
  'user-agent':
    'Mozilla/5.0 AppleWebKit/537.36 Chrome/126 Safari/537.36',
  'accept-language': 'tr-TR,tr;q=0.9'
};

const norm = (s = '') => s.replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
  try {
    const horseId = String(req.query.horseId || '').replace(/\D/g, '');

    if (!horseId) {
      return res.status(400).json({ error: 'horseId gerekli' });
    }

    const url =
      `https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri` +
      `?1=1&QueryParameter_AtId=${horseId}&Era=today`;

    const r = await fetch(url, { headers: H });

    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: 'TJK kariyer erişimi başarısız' });
    }

    const html = await r.text();
    const $ = cheerio.load(html);
    const top5 = [];

    $('table tbody tr').each((_, tr) => {
      const c = $(tr)
        .find('td')
        .map((__, td) => norm($(td).text()))
        .get();

      if (c.length < 5) return;

      const date = c.find(
        x =>
          /^\d{2}\.\d{2}\.\d{4}$/.test(x) ||
          /^\d{2}\/\d{2}\/\d{4}$/.test(x)
      );

      const fi = c.find(x => /^[1-9]\d?$/.test(x));
      const finish = Number(fi);

      if (!date || !finish || finish > 5) return;

      const dist = c.find(x => /^\d{3,4}$/.test(x));

      const track = c.find(x =>
        /^(Çim|Kum|Sentetik)$/i.test(x)
      );

      const cls = c.find(x =>
        /(Maiden|Handikap|Şartlı|KV-|G\d|A\d)/i.test(x)
      );

      const city = c.find(x =>
        /(İstanbul|Ankara|İzmir|Bursa|Kocaeli|Antalya|Adana|Elazığ|Şanlıurfa|Diyarbakır)/i.test(
          x
        )
      );

      top5.push({
        date,
        finish,
        city: city || '',
        distance: dist ? dist + 'm' : '',
        track: track || '',
        class: cls || ''
      });
    });

    top5.sort((a, b) => {
      const p = s => {
        const z = s.replace(/\//g, '.').split('.');
        return new Date(`${z[2]}-${z[1]}-${z[0]}`).getTime();
      };

      return p(b.date) - p(a.date);
    });

    res.setHeader(
      'Cache-Control',
      's-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({
      horseId,
      top5
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
