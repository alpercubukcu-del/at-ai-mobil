import * as cheerio from 'cheerio';

const URL =
  'https://www.tjk.org/TR/YarisSever/Query/Page/KosuSorgulama';

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':
    'tr-TR,tr;q=0.9,en;q=0.7'
};

function clean(v = '') {
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHtml(url) {
  const r = await fetch(url, {
    headers: HEADERS,
    redirect: 'follow'
  });

  if (!r.ok) {
    throw new Error(
      `TJK HTTP ${r.status}`
    );
  }

  return await r.text();
}

export default async function handler(
  req,
  res
) {
  try {
    const html =
      await fetchHtml(URL);

    const $ =
      cheerio.load(html);

    const forms = [];

    $('form').each((_, form) => {
      const fields = [];

      $(form)
        .find(
          'input, select, button, textarea'
        )
        .each((__, el) => {
          fields.push({
            tag:
              el.tagName,

            type:
              $(el).attr('type') || '',

            id:
              $(el).attr('id') || '',

            name:
              $(el).attr('name') || '',

            value:
              $(el).attr('value') || '',

            text:
              clean(
                $(el).text()
              ),

            onclick:
              $(el).attr('onclick') || '',

            onchange:
              $(el).attr('onchange') || ''
          });
        });

      forms.push({
        id:
          $(form).attr('id') || '',

        name:
          $(form).attr('name') || '',

        action:
          $(form).attr('action') || '',

        method:
          $(form).attr('method') || '',

        fields
      });
    });

    const links = [];

    $('a').each((_, a) => {
      const text =
        clean(
          $(a).text()
        );

      const href =
        $(a).attr('href') || '';

      const onclick =
        $(a).attr('onclick') || '';

      if (
        /Tarih|Daha Fazla|Sonuç|Göster/i.test(
          text
        ) ||
        /sort|order|load|more|page|row/i.test(
          href + ' ' + onclick
        )
      ) {
        links.push({
          text,
          href,
          onclick,

          id:
            $(a).attr('id') || '',

          class:
            $(a).attr('class') || ''
        });
      }
    });

    const buttons = [];

    $('button,input[type="button"],input[type="submit"]')
      .each((_, el) => {
        const text =
          clean(
            $(el).text() ||
            $(el).attr('value')
          );

        buttons.push({
          text,

          id:
            $(el).attr('id') || '',

          name:
            $(el).attr('name') || '',

          class:
            $(el).attr('class') || '',

          onclick:
            $(el).attr('onclick') || '',

          dataUrl:
            $(el).attr('data-url') || '',

          dataPage:
            $(el).attr('data-page') || ''
        });
      });

    const scripts = [];

    $('script[src]').each((_, s) => {
      scripts.push(
        $(s).attr('src')
      );
    });

    /*
      Inline scriptlerde sadece
      KosuSorgulama / DataRows /
      load more / sort ile ilgili
      parçaları yakala.
    */

    const inlineMatches = [];

    $('script:not([src])').each(
      (_, s) => {
        const text =
          $(s).html() || '';

        if (
          /KosuSorgulama|DataRows|Daha Fazla|loadmore|sort|orderby|order/i.test(
            text
          )
        ) {
          inlineMatches.push(
            text.slice(0, 15000)
          );
        }
      }
    );

    return res
      .status(200)
      .json({
        ok: true,

        version:
          'TJK-QUERY-DEBUG-V1',

        url: URL,

        forms,

        links,

        buttons,

        scripts,

        inlineMatches
      });

  } catch (e) {
    return res
      .status(500)
      .json({
        ok: false,

        error:
          e?.message ||
          'Tanı verisi alınamadı.'
      });
  }
            }
