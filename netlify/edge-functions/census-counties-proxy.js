/**
 * Netlify Edge Function – proxy Census Bureau TIGERweb county boundaries.
 *
 * tigerweb.geo.census.gov has a WAF that rejects bare server-side requests
 * without browser-like headers. This function adds the required headers
 * and returns the GeoJSON response with CORS headers.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TIGERWEB_BASE =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/82/query' +
  '?where=1%3D1&outFields=STATE,COUNTY,NAME&outSR=4326&f=geojson';

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const count = url.searchParams.get('resultRecordCount') || '500';
    const offset = url.searchParams.get('resultOffset') || '0';
    const queryUrl = `${TIGERWEB_BASE}&resultRecordCount=${count}&resultOffset=${offset}`;

    const resp = await fetch(queryUrl, {
      headers: {
        Accept: 'application/json, application/geo+json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; SentinelWildfireTracker/1.0)',
      },
    });

    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': resp.headers.get('Content-Type') || 'application/geo+json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
