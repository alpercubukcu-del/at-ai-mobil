import coreHandler from '../lib/tjk-model-roadmap-v11-core.js';

const CACHE_CONTROL = 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400';

export default async function handler(req, res) {
  const baseSetHeader = res.setHeader.bind(res);
  res.setHeader = (name, value) => {
    if (String(name || '').toLowerCase() === 'cache-control' && /no-store/i.test(String(value || ''))) {
      return baseSetHeader('Cache-Control', CACHE_CONTROL);
    }
    return baseSetHeader(name, value);
  };
  return coreHandler(req, res);
}
