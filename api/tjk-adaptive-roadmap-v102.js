import roadmapV101 from './tjk-adaptive-roadmap-v101.js';

const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.2.2';

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function upper(v = '') {
  return clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/*
 * TJK aynı yarış sınıfını farklı sayfalarda farklı gösterebiliyor.
 * Bu katman artık TEK YÖNLÜ kanonikleştirme yapmaz.
 *
 * 1) Önce Günlük Program'daki sınıf yazımı AYNEN denenir.
 * 2) Bu yazımla hiç eşleşme çıkmazsa kanonik alias denenir.
 *
 * Böylece hem:
 *   Program G 2/DHT  <-> Sorgu G 2/DHT
 * hem de:
 *   Program G 2/DHT  <-> Sorgu G 2
 * çalışır.
 * Aynı mantık Şartlı, Handikap, KV, Maiden, Satış ve diğer ailelere uygulanır.
 */
function canonicalClassForQuery(v = '') {
  const normalized = upper(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = normalized.split('/').map(clean).filter(Boolean);
  if (!parts.length) return clean(v);

  const head = parts[0];
  const rawTokens = parts.slice(1).map(token => token.replace(/\s+/g, ''));
  const hasFemale = rawTokens.some(token => token === 'D' || token === 'DISI');

  const ignoredDecorators = new Set([
    'DHOW', // DHÖW
    'DHO',  // DHÖ
    'HOW',  // HÖW
    'DHT',
    'DH'
  ]);

  const kept = rawTokens.filter(token => {
    if (!token) return false;
    if (token === 'D' || token === 'DISI') return false;
    if (ignoredDecorators.has(token)) return false;
    return true;
  });

  const ordered = [];
  if (hasFemale) ordered.push('DISI');
  for (const token of kept) if (!ordered.includes(token)) ordered.push(token);

  return ordered.length ? `${head}/${ordered.join('/')}` : head;
}

function selectedYearCount(payload) {
  const n = Number(payload?.diagnostics?.selectedYearCount);
  if (Number.isFinite(n)) return n;
  return Array.isArray(payload?.historicalRaces)
    ? payload.historicalRaces.filter(x => x?.date).length
    : 0;
}

function acceptedCandidateCount(payload) {
  const n = Number(payload?.diagnostics?.acceptedCandidateCount);
  return Number.isFinite(n) ? n : 0;
}

async function runV101(req, classValue) {
  const originalClass = req?.query?.class;
  const headers = {};
  let statusCode = 200;
  let payload = null;

  const captureRes = {
    setHeader(name, value) { headers[name] = value; },
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return value; }
  };

  try {
    if (req?.query) req.query.class = classValue;
    await roadmapV101(req, captureRes);
    return { statusCode, payload, headers };
  } finally {
    if (req?.query) req.query.class = originalClass;
  }
}

function decorate(payload, originalClass, canonicalClass, strategy, firstAttempt = null) {
  const aliasApplied = Boolean(originalClass && canonicalClass && upper(originalClass) !== upper(canonicalClass));
  const next = {
    ...(payload || {}),
    version:VERSION,
    classAlias:{
      input:originalClass || null,
      canonical:canonicalClass || originalClass || null,
      applied:aliasApplied,
      strategy,
      generic:true,
      rule:'Önce program sınıfı aynen; sıfır eşleşmede DHÖW/DHÖ/HÖW/DHT/DH aliasları kanonik fallback. Dişi ve H1/H2/H3 gerçek şart olarak korunur.'
    },
    classMatching:{
      strategy,
      generic:true,
      originalClassFirst:true,
      canonicalFallback:true,
      appliesTo:['GROUP','KV','HANDIKAP','SARTLI','MAIDEN','SATIS','OTHER'],
      firstAttemptSelectedYears:firstAttempt ? selectedYearCount(firstAttempt) : null,
      firstAttemptAcceptedCandidates:firstAttempt ? acceptedCandidateCount(firstAttempt) : null
    }
  };

  if (payload?.target && typeof payload.target === 'object') {
    next.target = {
      ...payload.target,
      class:originalClass || payload.target.class,
      classCanonical:canonicalClass || payload.target.class
    };
  }
  if (payload?.rules && typeof payload.rules === 'object') {
    next.rules = {
      ...payload.rules,
      classAliasNormalization:true,
      classAliasVersion:'TJK_BIDIRECTIONAL_CLASS_MATCH_V10.2.2',
      classMatchingStrategy:'ORIGINAL_CLASS_FIRST_CANONICAL_FALLBACK'
    };
  }
  if (payload?.diagnostics && typeof payload.diagnostics === 'object') {
    next.diagnostics = {
      ...payload.diagnostics,
      classMatchingStrategy:strategy,
      originalClassSelectedYears:firstAttempt ? selectedYearCount(firstAttempt) : selectedYearCount(payload),
      originalClassAcceptedCandidates:firstAttempt ? acceptedCandidateCount(firstAttempt) : acceptedCandidateCount(payload)
    };
  }
  return next;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const originalClass = clean(req?.query?.class || '');
  const canonicalClass = canonicalClassForQuery(originalClass);
  const aliasApplied = Boolean(originalClass && canonicalClass && upper(originalClass) !== upper(canonicalClass));

  try {
    // KRİTİK: önce TJK programındaki sınıfı HİÇ DEĞİŞTİRMEDEN dene.
    const raw = await runV101(req, originalClass);
    const rawPayload = raw.payload;
    const rawHasMatches = Boolean(
      rawPayload?.ok &&
      (selectedYearCount(rawPayload) > 0 || acceptedCandidateCount(rawPayload) > 0)
    );

    if (rawHasMatches || !aliasApplied) {
      return res.status(raw.statusCode || 200).json(
        decorate(rawPayload, originalClass, canonicalClass, 'ORIGINAL_CLASS')
      );
    }

    // Orijinal yazım 0 eşleşmeyse ancak o zaman kanonik alias dene.
    const canonical = await runV101(req, canonicalClass || originalClass);
    return res.status(canonical.statusCode || 200).json(
      decorate(canonical.payload, originalClass, canonicalClass, 'CANONICAL_ALIAS_FALLBACK', rawPayload)
    );
  } catch (e) {
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.message || 'Çift yönlü TJK sınıf eşleştirmesi başarısız.',
      classAlias:{ input:originalClass || null, canonical:canonicalClass || originalClass || null, applied:aliasApplied },
      classMatching:{ strategy:'FAILED', generic:true, originalClassFirst:true, canonicalFallback:true }
    });
  } finally {
    if (req?.query) req.query.class = originalClass;
  }
}
