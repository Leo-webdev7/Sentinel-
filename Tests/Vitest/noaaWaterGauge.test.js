import { describe, it, expect } from 'vitest';
import { gaugesToGeoJSON } from '../../src/api/noaaWaterGauge';

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
