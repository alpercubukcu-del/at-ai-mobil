const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.3.0';
const INTERNAL_TIMEOUT_MS = 150000;

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function getBaseUrl(req) {
  const host = clean(req.headers?.['x-forwarded-host']) || clean(req.headers?.host) || 'at-ai-mobil.vercel.app';
  const protocol = clean(req.headers?.['x-forwarded-proto']) || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

async function fetchJson(url, timeoutMs = INTERNAL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers:{ Accept:'application/json, text/plain, */*', 'Cache-Control':'no-cache' },
      signal:controller.signal
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new Error(`JSON olmayan cevap (${response.status}): ${text.slice(0,160)}`); }
    if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Tarihsel sınıf taraması zaman aşımına uğradı.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function copyQuery(req, endpoint, baseUrl) {
  const url = new URL(endpoint, baseUrl);
  for (const key of ['date','city','class','ageGroup','track','distance','minYear']) {
    const value = clean(req.query?.[key] || '');
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

function selectedYearCount(data) {
  const explicit = Number(data?.diagnostics?.selectedYearCount);
  if (Number.isFinite(explicit)) return explicit;
  return Array.isArray(data?.historicalRaces) ? data.historicalRaces.filter(x => x?.date).length : 0;
}

function acceptedCandidateCount(data) {
  const explicit = Number(data?.diagnostics?.acceptedCandidateCount);
  return Number.isFinite(explicit) ? explicit : 0;
}

function decorate(data, strategy, fallbackReason = null, rawError = null) {
  return {
    ...data,
    version:VERSION,
    sourceVersion:data?.version || null,
    classMatching:{
      strategy,
      generic:true,
      originalClassFirst:true,
      canonicalFallback:true,
      appliesTo:['GROUP','KV','HANDIKAP','SARTLI','MAIDEN','SATIS','OTHER'],
      note:'TJK Günlük Program ve Koşu Sorgulama aynı sınıfı farklı eklerle gösterebildiği için önce orijinal sınıf yazımı denenir; sonuç yoksa kanonik alias katmanı kullanılır.',
      fallbackReason,
      rawError
    },
    diagnostics:{
      ...(data?.diagnostics || {}),
      classMatchingStrategy:strategy,
      classMatchingFallbackReason:fallbackReason,
      originalClassSelectedYears:strategy === 'ORIGINAL_CLASS' ? selectedYearCount(data) : null,
      originalClassAcceptedCandidates:strategy === 'ORIGINAL_CLASS' ? acceptedCandidateCount(data) : null
    }
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const baseUrl = getBaseUrl(req);
  let raw = null;
  let rawError = null;

  try {
    // 1) En güvenilir kaynak: TJK'nın programda verdiği sınıfı değiştirmeden tara.
    // Bu, G 2/DHT, ŞARTLI 3/DHÖW, H1/H2 vb. gerçek satır yazımlarını korur.
    const rawUrl = copyQuery(req, '/api/tjk-adaptive-roadmap-v101', baseUrl);
    rawUrl.searchParams.set('t', String(Date.now()));
    raw = await fetchJson(rawUrl.toString());

    if (selectedYearCount(raw) > 0 || acceptedCandidateCount(raw) > 0) {
      return res.status(200).json(decorate(raw, 'ORIGINAL_CLASS'));
    }
  } catch (e) {
    rawError = e?.message || 'Orijinal sınıf taraması başarısız.';
  }

  try {
    // 2) TJK iki sayfada farklı ek kullanıyorsa mevcut V10.2 kanonik alias katmanına düş.
    const canonicalUrl = copyQuery(req, '/api/tjk-adaptive-roadmap-v102', baseUrl);
    canonicalUrl.searchParams.set('t', String(Date.now()));
    const canonical = await fetchJson(canonicalUrl.toString());
    const reason = rawError ? 'ORIGINAL_SCAN_ERROR' : 'ORIGINAL_SCAN_ZERO_MATCH';
    return res.status(200).json(decorate(canonical, 'CANONICAL_ALIAS_FALLBACK', reason, rawError));
  } catch (e) {
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.message || rawError || 'Genel sınıf eşleştirme taraması başarısız.',
      classMatching:{
        strategy:'FAILED', generic:true, originalClassFirst:true, canonicalFallback:true,
        rawError,
        canonicalError:e?.message || null
      }
    });
  }
}
