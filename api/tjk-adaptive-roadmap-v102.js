import roadmapV101 from './tjk-adaptive-roadmap-v101.js';

const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.2.4';

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
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * V12.5 SINIF KİMLİĞİ
 * -------------------
 * Yarış sınıfı ana aile + seviye + anlamlı /ekler ile tek kimliktir.
 * SATIŞ numarası kaybolmaz: SATIŞ 1, SATIŞ 2, SATIŞ 4 farklıdır.
 * Opsiyonel Satış ayrı sınıftır. Boş sondaki / yalnız yazım farkıdır.
 * D ve Dişi aynı dekoratör olarak ele alınır; diğer ekler korunur.
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
      strategy:'FULL_CLASS_IDENTITY_V12_5',
      decoratorsPreserved:true,
      numberedSalesPreserved:true,
      optionalSaleSeparated:true,
      trailingEmptySlashIgnored:true,
      fallbackRemoved:true,
      rule:'Ana sınıf + seviye + anlamlı /ekler birlikte eşleşir. SATIŞ numarası korunur; Opsiyonel Satış farklı sınıftır; boş sondaki / yalnız yazım farkıdır.'
    },
    classMatching:{
      strategy:'FULL_CLASS_IDENTITY_V12_5',
      generic:true,
      originalClassOnly:true,
      canonicalFallback:false,
      decoratorsPreserved:true,
      numberedSalesPreserved:true,
      optionalSaleSeparated:true,
      appliesTo:['GROUP','KV','HANDIKAP','SARTLI','MAIDEN','SATIS','OPSIYONEL_SATIS','OTHER']
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
      classMatchingVersion:'TJK_FULL_CLASS_IDENTITY_V12_5',
      classMatchingStrategy:'FULL_CLASS_IDENTITY_V12_5'
    };
  }
  if (payload?.diagnostics && typeof payload.diagnostics === 'object') {
    next.diagnostics = {
      ...payload.diagnostics,
      classMatchingStrategy:'FULL_CLASS_IDENTITY_V12_5'
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
        strategy:'FULL_CLASS_IDENTITY_V12_5',
        decoratorsPreserved:true,
        numberedSalesPreserved:true,
        optionalSaleSeparated:true,
        trailingEmptySlashIgnored:true,
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
