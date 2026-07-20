/**
 * NhcInvestsLayer.jsx
 * NHC Invest markers — pre-genesis systems (90L, 91L, …) tracked by the
 * Tropical Weather Outlook but not yet a designated tropical cyclone.
 * Rendered as a distinct "X" symbol (the NHC map convention) colored by
 * formation-chance, separate from the named-storm circle markers so an
 * Invest is never confused with an active cyclone.
 */

import { memo } from 'react';
import { Source, Layer } from 'react-map-gl';

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

const INVEST_COLOR_EXPR = [
  'match', ['get', 'formationChance'],
  'HIGH',   '#FF4444',
  'MEDIUM', '#FFA040',
  'LOW',    '#FFE566',
  '#94a3b8',
];

const NhcInvestsLayer = memo(function NhcInvestsLayer({ investsGeoJSON, visible }) {
  const vis = visible ? 'visible' : 'none';

  return (
    <Source id="nhc-invests" type="geojson" data={investsGeoJSON || EMPTY_FC}>
      {/* Soft outer halo ring */}
      <Layer
        id="nhc-invest-halo"
        type="circle"
        source="nhc-invests"
        layout={{ visibility: vis }}
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 14, 5, 18, 8, 22],
          'circle-color': INVEST_COLOR_EXPR,
          'circle-opacity': 0.15,
          'circle-stroke-color': INVEST_COLOR_EXPR,
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.4,
        }}
      />
      {/* Solid marker dot (click/hover target) */}
      <Layer
        id="nhc-invest-circle"
        type="circle"
        source="nhc-invests"
        layout={{ visibility: vis }}
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 7, 5, 9, 8, 11],
          'circle-color': INVEST_COLOR_EXPR,
          'circle-opacity': 0.9,
          'circle-stroke-color': '#000000',
          'circle-stroke-width': 1.5,
        }}
      />
      {/* NHC convention: an "X" glyph marks a pre-genesis Invest */}
      <Layer
        id="nhc-invest-symbol"
        type="symbol"
        source="nhc-invests"
        layout={{
          visibility: vis,
          'text-field': 'X',
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 8, 13],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{ 'text-color': '#000000' }}
      />
      {/* Invest ID label */}
      <Layer
        id="nhc-invest-label"
        type="symbol"
        source="nhc-invests"
        layout={{
          visibility: vis,
          'text-field': ['get', 'investId'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 13],
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#e2e8f0',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  );
});

export default NhcInvestsLayer;
