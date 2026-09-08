import tjkAdaptiveRoadmapV10 from '../../api/tjk-adaptive-roadmap-v10.js';
import tjkAdaptiveRoadmapV102 from '../../api/tjk-adaptive-roadmap-v102.js';
import tjkBetStartsV11 from '../../api/tjk-bet-starts-v11.js';
import tjkCareerFallbackV1113 from '../../api/tjk-career-fallback-v1113.js';
import tjkCareerForeignV1 from '../../api/tjk-career-foreign-v1.js';
import tjkCareerV10 from '../../api/tjk-career-v10.js';
import tjkForeignHorseIdsV1 from '../../api/tjk-foreign-horse-ids-v1.js';
import tjkHistory from '../../api/tjk-history.js';
import tjkModelRoadmapV11 from '../../api/tjk-model-roadmap-v11.js';
import tjkProgram from '../../api/tjk-program.js';
import tjkRaceMeta from '../../api/tjk-race-meta.js';
import tjkRoadmap from '../../api/tjk-roadmap.js';
import tjkSimilar from '../../api/tjk-similar.js';

const handlers = {
  'tjk-adaptive-roadmap-v10': tjkAdaptiveRoadmapV10,
  'tjk-adaptive-roadmap-v101': tjkAdaptiveRoadmapV102,
  'tjk-adaptive-roadmap-v102': tjkAdaptiveRoadmapV102,
  'tjk-bet-starts-v11': tjkBetStartsV11,
  'tjk-career': tjkCareerFallbackV1113,
  'tjk-career-fallback-v1113': tjkCareerFallbackV1113,
  'tjk-career-foreign-v1': tjkCareerForeignV1,
  'tjk-career-v10': tjkCareerV10,
  'tjk-foreign-horse-ids-v1': tjkForeignHorseIdsV1,
  'tjk-history': tjkHistory,
  'tjk-margin-enrich-v122': tjkHistory,
  'tjk-model-roadmap-v11': tjkModelRoadmapV11,
  'tjk-program': tjkProgram,
  'tjk-race-meta': tjkRaceMeta,
  'tjk-roadmap': tjkRoadmap,
  'tjk-similar': tjkSimilar
};

const nodeOnlyHandlers = new Set([
  'tjk-conditional-v4-blind'
]);

function queryFromUrl(url) {
  const out = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = Array.isArray(out[key])
        ? [...out[key], value]
        : [out[key], value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function bodyFromRequest(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const text = await request.text();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; }
}

function requestHeaders(request, url) {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  headers.host ||= url.host;
  headers['x-forwarded-host'] ||= url.host;
  headers['x-forwarded-proto'] ||= url.protocol.replace(':', '');
  return headers;
}

function createResponseBridge() {
  const headers = new Headers();
  let statusCode = 200;
  let response = null;

  const send = body => {
    const payload =
      typeof body === 'string' || body instanceof ArrayBuffer
        ? body
        : JSON.stringify(body ?? '');
    response = new Response(payload, { status: statusCode, headers });
    return response;
  };

  return {
    setHeader(name, value) {
      headers.set(name, value);
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json; charset=utf-8');
      }
      response = new Response(JSON.stringify(body), {
        status: statusCode,
        headers
      });
      return response;
    },
    send,
    end(body = '') {
      return send(body);
    },
    get response() {
      return response;
    }
  };
}

function apiNameFromParams(params = {}) {
  const raw = Array.isArray(params.path)
    ? params.path.join('/')
    : String(params.path || '');
  return raw.replace(/^\/+|\/+$/g, '').split('/')[0];
}

export async function onRequest(context) {
  const { request, params } = context;
  const apiName = apiNameFromParams(params);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'content-type,accept'
      }
    });
  }

  const handler = handlers[apiName];
  if (nodeOnlyHandlers.has(apiName)) {
    return Response.json(
      {
        ok: false,
        error:
          `${apiName} Cloudflare Pages üzerinde devre dışı: Node fs/vm gerektiriyor.`
      },
      { status: 501 }
    );
  }

  if (!handler) {
    return Response.json(
      { ok: false, error: `API bulunamadı: ${apiName || '-'}` },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const req = {
    method: request.method,
    headers: requestHeaders(request, url),
    query: queryFromUrl(url),
    body: await bodyFromRequest(request)
  };
  const res = createResponseBridge();

  try {
    const returned = await handler(req, res);
    return returned instanceof Response
      ? returned
      : res.response || Response.json(returned ?? { ok: true });
  } catch (error) {
    console.error('[AT AI Cloudflare API]', apiName, error);
    return Response.json(
      { ok: false, error: error?.message || 'Cloudflare API hatası' },
      { status: 500 }
    );
  }
}
