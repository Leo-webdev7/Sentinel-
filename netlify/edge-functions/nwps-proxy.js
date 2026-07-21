/**
 * Netlify Edge Function – proxy NOAA National Water Prediction Service (NWPS).
 *
 * api.water.noaa.gov does not send CORS headers for cross-origin browser
 * requests, so direct fetch() calls fail. This function runs server-side and
 * re-exposes the endpoints with explicit CORS headers.
 *
 * Routes (after stripping /api/nwps prefix):
 *   /gauges                             → GET /gauges (bbox-filtered gauge list)
 *   /gauges/<lid>                       → GET /gauges/{lid} (single gauge detail)
 *   /gauges/<lid>/stageflow             → GET /gauges/{lid}/stageflow
 *   /gauges/<lid>/stageflow/observed    → observed time-series
 *   /gauges/<lid>/stageflow/forecast    → forecast time-series
 *
 * The incoming query string (e.g. ?bbox.xmin=…&srid=EPSG_4326) is forwarded
 * verbatim to the upstream API.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const NWPS_BASE = 'https://api.water.noaa.gov/nwps/v1';

const NWPS_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Sentinel Wildfire Platform (contact@sentinel.app)',
};

// Only allow safe NWPS sub-paths:
//   /gauges, /gauges/<lid>, /gauges/<lid>/stageflow[/observed|/forecast]
const ALLOWED = /^\/gauges(\/[A-Za-z0-9_-]+(\/stageflow(\/(observed|forecast))?)?)?$/;

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const sub = url.pathname.replace(/^\/api\/nwps/, '') || '/';

  if (!ALLOWED.test(sub)) {
    return new Response(JSON.stringify({ error: 'Unknown NWPS sub-route' }), {
      status: 404,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Forward the query string (bbox/srid params) verbatim to the upstream API.
  const target = `${NWPS_BASE}${sub}${url.search}`;

  try {
    const resp = await fetch(target, { headers: NWPS_HEADERS });
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...CORS,
        'Content-Type': resp.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
};
