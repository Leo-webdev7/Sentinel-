/**
 * WaterGaugesLayer.jsx
 * NOAA NWPS water gauges rendered as color-coded circles by flood category.
 * Visible at all zoom levels.
 */

import { memo } from 'react';
import { Source, Layer } from 'react-map-gl';

const EMPTY = { type: 'FeatureCollection', features: [] };
const MIN_ZOOM = 0;

// Color by flood category (matches NOAA color conventions)
const CATEGORY_COLOR = [
  'match', ['get', 'floodCategory'],
  'major',    '#cc33ff',
  'moderate', '#ff0000',
  'minor',    '#ff8c00',
  'action',   '#ffff00',
  /* default (normal / no data) */ '#1e90ff',
];

const WaterGaugesLayer = memo(function WaterGaugesLayer({ geoJSON, visible }) {
  const vis = visible ? 'visible' : 'none';
  const data = geoJSON || EMPTY;

  return (
    <Source id="water-gauges" type="geojson" data={data}>
      {/* Glow ring */}
      <Layer
        id="water-gauges-glow"
        type="circle"
        minzoom={MIN_ZOOM}
        layout={{ visibility: vis }}
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 8, 10, 18],
          'circle-color': CATEGORY_COLOR,
          'circle-opacity': 0.18,
          'circle-blur': 0.7,
          'circle-stroke-width': 0,
        }}
      />

      {/* Main station dot – interactive target */}
      <Layer
        id="water-gauges-circle"
        type="circle"
        minzoom={MIN_ZOOM}
        layout={{ visibility: vis }}
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 5, 3, 8, 5, 12, 8],
          'circle-color': CATEGORY_COLOR,
          'circle-opacity': 0.95,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        }}
      />

      {/* Stage label at higher zoom */}
      <Layer
        id="water-gauges-label"
        type="symbol"
        minzoom={9}
        layout={{
          visibility: vis,
          'text-field': [
            'case',
            ['!=', ['get', 'currentStage'], null],
            ['concat', ['to-string', ['round', ['get', 'currentStage']]], ' ft'],
            '',
          ],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 0.8],
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  );
});

export default WaterGaugesLayer;
