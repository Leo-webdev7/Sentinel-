/**
 * NhcWatchesWarningsLayer.jsx
 * NHC coastal watch/warning breakpoints for active tropical cyclones
 * (Hurricane/Tropical Storm/Storm Surge Watches & Warnings).
 * Geometry is typically LineString (coastal segments) but this renders both
 * line and fill paint so the layer degrades gracefully if NHC publishes
 * polygon breakpoints instead.
 */

import { memo } from 'react';
import { Source, Layer } from 'react-map-gl';

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

const WW_COLOR_EXPR = [
  'case',
  ['!=', ['get', 'strokeColor'], null], ['get', 'strokeColor'],
  '#94a3b8',
];
const WW_FILL_COLOR_EXPR = [
  'case',
  ['!=', ['get', 'fillColor'], null], ['get', 'fillColor'],
  '#94a3b8',
];

const NhcWatchesWarningsLayer = memo(function NhcWatchesWarningsLayer({ geoJSON, visible }) {
  const vis = visible ? 'visible' : 'none';

  return (
    <Source id="nhc-watches-warnings" type="geojson" data={geoJSON || EMPTY_FC}>
      <Layer
        id="nhc-ww-fill"
        type="fill"
        source="nhc-watches-warnings"
        filter={['==', ['geometry-type'], 'Polygon']}
        layout={{ visibility: vis }}
        paint={{ 'fill-color': WW_FILL_COLOR_EXPR, 'fill-opacity': 0.15 }}
      />
      <Layer
        id="nhc-ww-line"
        type="line"
        source="nhc-watches-warnings"
        layout={{ visibility: vis, 'line-cap': 'round' }}
        paint={{ 'line-color': WW_COLOR_EXPR, 'line-width': 4, 'line-opacity': 0.9 }}
      />
    </Source>
  );
});

export default NhcWatchesWarningsLayer;
