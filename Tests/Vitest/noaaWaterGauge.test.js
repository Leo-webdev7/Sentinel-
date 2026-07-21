import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  gaugesToGeoJSON,
  categoryForStage,
  fetchWaterGauges,
  fetchGaugeDetail,
  fetchGaugeStageFlow,
} from '../../src/api/noaaWaterGauge';

// Bypass the module-level cache so every fetch test exercises the network path.
vi.mock('../../src/utils/dataCache', () => ({
  getCached: () => null,
  setCached: () => {},
}));

describe('gaugesToGeoJSON', () => {
  it('maps NWPS gauge live water-level info into feature properties that drive the overlay', () => {
    const gauges = [
      {
        lid: 'CCKC1',
        name: 'Sacramento River at Colusa',
        state: 'CA',
        county: 'Colusa',
        hsa: 'STO',
        datum: 'NAVD88',
        latitude: 39.21,
        longitude: -122.01,
        flood: { action: 45, minor: 50, moderate: 55, major: 60 },
        status: { observed: { primary: { value: 52.3 }, floodCategory: 'minor' } },
      },
    ];

    const geojson = gaugesToGeoJSON(gauges);

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(1);

    const f = geojson.features[0];
    expect(f.type).toBe('Feature');
    expect(f.geometry.type).toBe('Point');
    // GeoJSON is [lon, lat]
    expect(f.geometry.coordinates).toEqual([-122.01, 39.21]);

    const p = f.properties;
    expect(p.lid).toBe('CCKC1');
    expect(p.name).toBe('Sacramento River at Colusa');
    expect(p.state).toBe('CA');
    expect(p.county).toBe('Colusa');
    // Live water-level information used for the on-map graphical overlay:
    expect(p.currentStage).toBe(52.3);   // stage label
    expect(p.floodCategory).toBe('minor'); // circle color
    expect(p.actionStage).toBe(45);
    expect(p.minorStage).toBe(50);
    expect(p.moderateStage).toBe(55);
    expect(p.majorStage).toBe(60);
  });

  it('reads the REAL NWPS shape: primary as a number + flood.categories.{cat}.stage', () => {
    const gauges = [
      {
        lid: 'CAGM7',
        name: 'Missouri River at Hermann',
        state: { abbreviation: 'MO', name: 'Missouri' }, // real API returns an object
        county: 'Gasconade',
        wfo: { abbreviation: 'LSX', name: 'St. Louis' },
        latitude: 38.71,
        longitude: -91.44,
        flood: {
          categories: {
            action:   { stage: 16, flow: 100 },
            minor:    { stage: 21, flow: 200 },
            moderate: { stage: 27, flow: 300 },
            major:    { stage: 30, flow: 400 },
          },
        },
        status: { observed: { primary: 22.4, primaryUnit: 'ft', floodCategory: 'minor' } },
      },
    ];

    const p = gaugesToGeoJSON(gauges).features[0].properties;
    expect(p.currentStage).toBe(22.4);
    expect(p.floodCategory).toBe('minor');
    expect(p.actionStage).toBe(16);
    expect(p.minorStage).toBe(21);
    expect(p.moderateStage).toBe(27);
    expect(p.majorStage).toBe(30);
    // Object-valued state / wfo are flattened to strings the UI can render.
    expect(p.state).toBe('MO');
    expect(p.hsa).toBe('LSX');
  });

  it('derives the flood category from the stage when the API omits floodCategory', () => {
    const gauges = [
      {
        lid: 'NOCAT1',
        latitude: 30,
        longitude: -90,
        flood: { categories: { action: { stage: 10 }, minor: { stage: 15 }, moderate: { stage: 20 }, major: { stage: 25 } } },
        status: { observed: { primary: 21.0 } }, // no floodCategory field
      },
    ];

    const p = gaugesToGeoJSON(gauges).features[0].properties;
    expect(p.currentStage).toBe(21.0);
    expect(p.floodCategory).toBe('moderate'); // 21 ≥ moderate(20), < major(25)
  });

  it('normalises verbose / spaced category strings to canonical keys', () => {
    const gauges = [
      { lid: 'X', latitude: 1, longitude: 2, status: { observed: { primary: 5, floodCategory: 'Major Flood' } } },
    ];
    expect(gaugesToGeoJSON(gauges).features[0].properties.floodCategory).toBe('major');
  });

  it('reads the alternate status shape (status.current.primaryStage)', () => {
    const gauges = [
      {
        lid: 'ABC1',
        latitude: 30,
        longitude: -90,
        status: { current: { primaryStage: { value: 12.5 } } },
      },
    ];

    const p = gaugesToGeoJSON(gauges).features[0].properties;
    expect(p.currentStage).toBe(12.5);
  });

  it('defaults floodCategory to no_flooding and stages to null when absent', () => {
    const gauges = [{ lid: 'ABC2', latitude: 40, longitude: -100 }];

    const p = gaugesToGeoJSON(gauges).features[0].properties;
    expect(p.floodCategory).toBe('no_flooding');
    expect(p.currentStage).toBeNull();
    expect(p.actionStage).toBeNull();
    expect(p.majorStage).toBeNull();
  });

  it('reads coordinates from nested geometry when lat/lon are absent', () => {
    const gauges = [
      { lid: 'GEO1', geometry: { coordinates: [-95.5, 29.7] } },
    ];

    const f = gaugesToGeoJSON(gauges).features[0];
    expect(f.geometry.coordinates).toEqual([-95.5, 29.7]);
  });

  it('skips gauges without usable coordinates', () => {
    const gauges = [
      { lid: 'NO_COORDS', name: 'Missing location' },
      { lid: 'OK', latitude: 1, longitude: 2 },
    ];

    const geojson = gaugesToGeoJSON(gauges);
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0].properties.lid).toBe('OK');
  });

  it('returns an empty FeatureCollection for an empty list', () => {
    const geojson = gaugesToGeoJSON([]);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(0);
  });
});

describe('categoryForStage', () => {
  const thr = { action: 10, minor: 15, moderate: 20, major: 25 };
  it('classifies stages against thresholds in descending severity', () => {
    expect(categoryForStage(26, thr)).toBe('major');
    expect(categoryForStage(22, thr)).toBe('moderate');
    expect(categoryForStage(16, thr)).toBe('minor');
    expect(categoryForStage(11, thr)).toBe('action');
    expect(categoryForStage(5, thr)).toBe('no_flooding');
  });
  it('returns null when the stage is unknown', () => {
    expect(categoryForStage(null, thr)).toBeNull();
  });
});

describe('fetchWaterGauges', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the US bounding box with srid and reads data.gauges', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ gauges: [{ lid: 'A', latitude: 1, longitude: 2, status: { observed: { primary: 3 } } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const geo = await fetchWaterGauges();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/api/nwps/gauges?');
    expect(url).toContain('bbox.xmin=');
    expect(url).toContain('bbox.ymax=');
    expect(url).toContain('srid=EPSG_4326');
    expect(geo.features).toHaveLength(1);
    expect(geo.features[0].properties.currentStage).toBe(3);
  });

  it('falls back to the unfiltered endpoint when the bbox query returns nothing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ gauges: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ gauges: [{ lid: 'B', latitude: 4, longitude: 5 }] }) });
    vi.stubGlobal('fetch', fetchMock);

    const geo = await fetchWaterGauges();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/nwps/gauges');
    expect(geo.features).toHaveLength(1);
    expect(geo.features[0].properties.lid).toBe('B');
  });

  it('throws on a non-ok primary response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchWaterGauges()).rejects.toThrow('NWPS gauges HTTP 500');
  });
});

describe('fetchGaugeDetail', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalises the real detail shape into thresholds/currentStage/floodCategory/impacts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lid: 'CAGM7',
        name: 'Missouri River at Hermann',
        state: { abbreviation: 'MO', name: 'Missouri' },
        flood: {
          categories: {
            action: { stage: 16 }, minor: { stage: 21 }, moderate: { stage: 27 }, major: { stage: 30 },
          },
          impacts: [
            { stage: 22, statement: 'Low-lying roads flood.' },
            { stage: 28, statement: 'Major agricultural losses.' },
          ],
        },
        status: { observed: { primary: 22.4, floodCategory: 'minor' } },
      }),
    }));

    const d = await fetchGaugeDetail('CAGM7');
    expect(d.currentStage).toBe(22.4);
    expect(d.floodCategory).toBe('minor');
    expect(d.thresholds).toEqual({ action: 16, minor: 21, moderate: 27, major: 30 });
    expect(d.state).toBe('MO');
    expect(d.impacts).toHaveLength(2);
    // Impact at 22 ft is banded minor (21–27), the one at 28 ft is moderate.
    expect(d.impacts[0]).toMatchObject({ stage: 22, category: 'minor' });
    expect(d.impacts[1]).toMatchObject({ stage: 28, category: 'moderate' });
  });
});

describe('fetchGaugeStageFlow', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches the observed and forecast sub-endpoints and parses data[]', async () => {
    const fetchMock = vi.fn((url) => {
      if (url.endsWith('/observed')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [
          { validTime: '2026-07-20T00:00:00Z', primary: 10.1 },
          { validTime: '2026-07-20T06:00:00Z', primary: 10.5 },
        ] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [
        { validTime: '2026-07-21T00:00:00Z', primary: 11.0 },
      ] }) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const s = await fetchGaugeStageFlow('CAGM7');

    const calledObserved = fetchMock.mock.calls.some(([u]) => u.endsWith('/stageflow/observed'));
    const calledForecast = fetchMock.mock.calls.some(([u]) => u.endsWith('/stageflow/forecast'));
    expect(calledObserved).toBe(true);
    expect(calledForecast).toBe(true);

    expect(s.observed).toHaveLength(2);
    expect(s.observed[0].stage).toBe(10.1);
    expect(Number.isFinite(s.observed[0].time)).toBe(true);
    expect(s.forecast).toHaveLength(1);
    expect(s.forecast[0].stage).toBe(11.0);
  });

  it('treats a failed sub-endpoint as an empty series rather than throwing', async () => {
    const fetchMock = vi.fn((url) =>
      url.endsWith('/observed')
        ? Promise.resolve({ ok: true, json: async () => ({ data: [{ validTime: '2026-07-20T00:00:00Z', primary: 9 }] }) })
        : Promise.resolve({ ok: false, status: 404 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const s = await fetchGaugeStageFlow('X');
    expect(s.observed).toHaveLength(1);
    expect(s.forecast).toEqual([]);
  });
});
