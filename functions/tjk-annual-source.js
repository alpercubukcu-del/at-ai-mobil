const TARGET =
  'https://www.tjk.org/TR/YarisSever/Query/DataRows/YillikYarisProgramiCoklu';
const TIMEOUT_MS = 30000;

export async function onRequestGet({ request }) {
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(TARGET);
  sourceUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/139 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.7'
      },
      signal: controller.signal
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':
          'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400',
        'Content-Type':
          upstream.headers.get('content-type') ||
          'text/html; charset=utf-8'
      }
    });
  } catch (error) {
    return new Response(
      error?.name === 'AbortError'
        ? 'TJK yıllık arşiv zaman aşımına uğradı.'
        : error?.message || 'TJK yıllık arşiv alınamadı.',
      {
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      }
    );
  } finally {
    clearTimeout(timer);
  }
}
