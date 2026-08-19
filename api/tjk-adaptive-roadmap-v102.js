import roadmapV101 from './tjk-adaptive-roadmap-v101.js';

const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.2.1';

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
 * TJK aynı yarış sınıfını iki farklı sayfada farklı gösterebiliyor.
 * Örnekler:
 *   Günlük Program : Handikap 14 /DHÖW/H2/D
 *   Koşu Sorgulama: Handikap 14 /Dişi /H2
 *
 *   Günlük/Yıllık Program: G 2 /DHT
 *   Koşu Sorgulama / performans özeti: G 2
 *
 * Bu katman yalnız sayfalar arası gösterim aliaslarını kanonikleştirir.
 * H1/H2/H3 gibi gerçek handikap alt şartları ve Dişi şartı korunur.
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
    'DHT',  // Koşu Sorgulama bazı satırlarda göstermiyor
    'DH'    // Koşu Sorgulama bazı satırlarda göstermiyor
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

export default async function handler(req, res) {
  const originalClass = clean(req?.query?.class || '');
  const canonicalClass = canonicalClassForQuery(originalClass);
  const aliasApplied = Boolean(originalClass && canonicalClass && upper(originalClass) !== upper(canonicalClass));

  if (req?.query) req.query.class = canonicalClass || originalClass;

  const originalJson = typeof res.json === 'function' ? res.json.bind(res) : null;
  if (originalJson) {
    res.json = payload => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return originalJson(payload);
      const next = {
        ...payload,
        version:VERSION,
        classAlias:{
          input:originalClass || null,
          canonical:canonicalClass || originalClass || null,
          applied:aliasApplied,
          rule:'DHÖW/DHÖ/HÖW/DHT/DH query-display decorators ignored; standalone D or Dişi => DISI; H1/H2/H3 and other real suffixes preserved.'
        }
      };
      if (payload.target && typeof payload.target === 'object') {
        next.target = {
          ...payload.target,
          class:originalClass || payload.target.class,
          classCanonical:canonicalClass || payload.target.class
        };
      }
      if (payload.rules && typeof payload.rules === 'object') {
        next.rules = {
          ...payload.rules,
          classAliasNormalization:true,
          classAliasVersion:'TJK_PROGRAM_TO_QUERY_CLASS_ALIAS_V10.2.1'
        };
      }
      return originalJson(next);
    };
  }

  try {
    return await roadmapV101(req, res);
  } finally {
    if (req?.query) req.query.class = originalClass;
  }
}
