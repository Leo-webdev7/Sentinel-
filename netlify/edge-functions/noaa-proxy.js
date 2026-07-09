/**
 * noaa-proxy.js
 * Netlify Edge Function — proxies requests to NOAA MapServer endpoints.
 * Routes /api/noaa/* to the appropriate NWS reference map FeatureServer.
 */

const NOAA_BASE = 'https://mapservices.weather.noaa.gov/static/rest/services/nws_reference_maps/nws_reference_map';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ROUTE_MAP = {
  'cwa': { featureServer: 2, outFields: '*' },
  'firewxzones': { featureServer: 9, outFields: 'state,zone' },
  'marinezones': { featureServer: 5, outFields: 'id' },
};

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/noaa\//, '');
    const route = ROUTE_MAP[path];

    if (!route) {
      return new Response(JSON.stringify({ error: 'Unknown NOAA route' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const fs = route.featureServer;
    const outFields = route.outFields;
    const queryUrl = `${NOAA_BASE}/FeatureServer/${fs}/query?where=1%3D1&outFields=${outFields}&outSR=4326&f=geojson`;

    const resp = await fetch(queryUrl, {
      headers: {
        Accept: 'application/json, application/geo+json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; SentinelWildfireTracker/1.0)',
      },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Upstream error ${resp.status}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
