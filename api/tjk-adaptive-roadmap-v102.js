import roadmapV101 from './tjk-adaptive-roadmap-v101.js';

const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.2.3';

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function upper(v = '') {
  return clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function lexicalClass(v = '') {
  return upper(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * V11.12 SINIF KURALI
 * ------------------
 * Yarış sınıfı ana sınıf + bütün /ekleri ile TEK KİMLİKTİR.
 * Hiçbir dekoratör/şart düşürülmez.
 *
 * Örnek:
 *   Handikap 14 /DHÖW/H3 === Handikap 14 /DHÖW/H3
 *   Handikap 14 /DHÖW/H3 !== Handikap 14 /DHÖW
 *   Handikap 14 /DHÖW/H3 !== Handikap 14 /DHÖW/H3/D
 *   G2 /DHT === G 2 /DHT === G-2 /DHT  (başlık yazım farkı)
 *   G2 /DHT !== G2
 *
 * Önceki V10.2.2'de bulunan DHÖW/DHÖ/HÖW/DHT/DH kaldıran
 * canonical fallback tamamen kaldırılmıştır.
 */
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

function decorate(payload, originalClass) {
  const next = {
    ...(payload || {}),
    version:VERSION,
    classIdentity:{
      input:originalClass || null,
      lexical:lexicalClass(originalClass) || null,
      strategy:'FULL_CLASS_IDENTITY',
      decoratorsPreserved:true,
      fallbackRemoved:true,
      rule:'Ana sınıf ve tüm /ekler birlikte eşleşir; DHÖW, DHÖ, HÖW, DHT, DH, H1/H2/H3, D, Y-1/Y-2 vb. hiçbir ek silinmez.'
    },
    classMatching:{
      strategy:'FULL_CLASS_IDENTITY',
      generic:true,
      originalClassOnly:true,
      canonicalFallback:false,
      decoratorsPreserved:true,
      appliesTo:['GROUP','KV','HANDIKAP','SARTLI','MAIDEN','SATIS','OTHER']
    }
  };

  if (payload?.target && typeof payload.target === 'object') {
    next.target = {
      ...payload.target,
      class:originalClass || payload.target.class,
      classIdentity:lexicalClass(originalClass || payload.target.class)
    };
  }
  if (payload?.rules && typeof payload.rules === 'object') {
    next.rules = {
      ...payload.rules,
      fullClassIdentity:true,
      classAliasNormalization:false,
      classMatchingVersion:'TJK_FULL_CLASS_IDENTITY_V11.12',
      classMatchingStrategy:'FULL_CLASS_IDENTITY'
    };
  }
  if (payload?.diagnostics && typeof payload.diagnostics === 'object') {
    next.diagnostics = {
      ...payload.diagnostics,
      classMatchingStrategy:'FULL_CLASS_IDENTITY'
    };
  }
  return next;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const originalClass = clean(req?.query?.class || '');

  try {
    const result = await runV101(req, originalClass);
    return res.status(result.statusCode || 200).json(
      decorate(result.payload, originalClass)
    );
  } catch (e) {
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.message || 'Tam yarış sınıfı eşleştirmesi başarısız.',
      classIdentity:{
        input:originalClass || null,
        lexical:lexicalClass(originalClass) || null,
        strategy:'FULL_CLASS_IDENTITY',
        decoratorsPreserved:true,
        fallbackRemoved:true
      },
      classMatching:{
        strategy:'FAILED',
        originalClassOnly:true,
        canonicalFallback:false,
        decoratorsPreserved:true
      }
    });
  } finally {
    if (req?.query) req.query.class = originalClass;
  }
}
