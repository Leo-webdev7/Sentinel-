/**
 * EvacZonesLayer.jsx
 * Renders California evacuation orders, warnings, and watches as
 * semi-transparent, hatched polygon overlays with bold black boundaries —
 * matching the standard Zonehaven/Genasys zone-map look used by county
 * OES dashboards. This is a permanent map layer: it is always rendered
 * on the wildfire and all-hazard tabs and is not user-toggleable.
 *
 * Accepts data from the combined CalOES hosted-view + PROD feed
 * (see useCombinedEvacZones). Both sources are normalised to the
 * same flat schema before being passed here, so this component
 * only needs to handle:
 *
 *   warningType – "Evacuation Order" | "Evacuation Warning" | "Evacuation Watch"
 *   zoneName    – display label
 *   county      – county name
 *   agency      – responsible agency (may be empty)
 *   instructions
 *   comments
 *   effectiveDate / expirationDate
 *   externalURL
 *   source      – "hosted" | "prod"
 *
 * Color scheme mirrors standard Cal OES zone classification:
 *   Order   (mandatory evacuation) → red
 *   Warning (voluntary evacuation) → orange
 *   Watch / Advisory (preparedness) → yellow
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { Source, Layer, useMap } from 'react-map-gl';

const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] };

/**
 * Compute the centroid of a GeoJSON Polygon or MultiPolygon ring.
 * Returns [lng, lat] or null.
 */
function polygonCentroid(geometry) {
  try {
    if (!geometry) return null;
    const coords =
      geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : null;
    if (!coords?.length) return null;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return [lng, lat];
  } catch {
    return null;
  }
}

const COLOR_MATCH = [
  'match',
  ['get', 'warningType'],
  'Evacuation Order',   '#ef4444',
  'Evacuation Warning', '#f97316',
  'Evacuation Watch',   '#eab308',
  /* default */         '#f97316',
];

const OPACITY_MATCH = [
  'match',
  ['get', 'warningType'],
  'Evacuation Order',   0.60,
  'Evacuation Warning', 0.50,
  'Evacuation Watch',   0.40,
  /* default */         0.45,
];

const LINE_WIDTH_MATCH = [
  'match',
  ['get', 'warningType'],
  'Evacuation Order',   3.5,
  'Evacuation Warning', 3.0,
  'Evacuation Watch',   2.5,
  /* default */         2.5,
];

// Diagonal-tick hatch pattern (per warning severity), matching the county
// zone-map reference look. Registered as Mapbox images on first load and
// re-registered whenever the underlying map style reloads (SAT ↔ MAP toggle).
const HATCH_ICON_IDS = {
  'Evacuation Order':   'sentinel-evac-hatch-order',
  'Evacuation Warning': 'sentinel-evac-hatch-warning',
  'Evacuation Watch':   'sentinel-evac-hatch-watch',
};

const HATCH_SOURCES = [
  { id: HATCH_ICON_IDS['Evacuation Order'],   color: '#ef4444' },
  { id: HATCH_ICON_IDS['Evacuation Warning'], color: '#f97316' },
  { id: HATCH_ICON_IDS['Evacuation Watch'],   color: '#eab308' },
];

function hatchSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
    <line x1="4" y1="17" x2="12" y2="3" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
  </svg>`;
}

const PATTERN_MATCH = [
  'match',
  ['get', 'warningType'],
  'Evacuation Order',   HATCH_ICON_IDS['Evacuation Order'],
  'Evacuation Warning', HATCH_ICON_IDS['Evacuation Warning'],
  'Evacuation Watch',   HATCH_ICON_IDS['Evacuation Watch'],
  /* default */         HATCH_ICON_IDS['Evacuation Warning'],
];

export default function EvacZonesLayer({ geoJSON, visible }) {
  const vis = visible ? 'visible' : 'none';
  const data = geoJSON || EMPTY_GEOJSON;
  const { current: map } = useMap();
  const prevCountRef = useRef(0);
  const [patternsReady, setPatternsReady] = useState(false);

  // Register the hatch-pattern images used by the fill-pattern layer below.
  // Re-registered on style reload since custom images are cleared when the
  // basemap style changes (satellite ↔ rendered).
  useEffect(() => {
    if (!map) return;

    function allRegistered() {
      return HATCH_SOURCES.every(({ id }) => map.hasImage(id));
    }

    function registerPatterns() {
      HATCH_SOURCES.forEach(({ id, color }) => {
        if (map.hasImage(id)) return;
        const img = new Image(20, 20);
        img.onload = () => {
          if (!map.hasImage(id)) {
            try {
              map.addImage(id, img);
            } catch {
              return;
            }
          }
          if (allRegistered()) setPatternsReady(true);
        };
        img.src = `data:image/svg+xml;base64,${btoa(hatchSvg(color))}`;
      });
      if (allRegistered()) setPatternsReady(true);
    }

    function onStyleData() {
      if (!allRegistered()) {
        setPatternsReady(false);
        registerPatterns();
      }
    }

    map.on('styledata', onStyleData);
    if (map.isStyleLoaded()) registerPatterns();

    return () => map.off('styledata', onStyleData);
  }, [map]);

  // Build a companion FeatureCollection of centroid points for the dot layer
  const dotsData = useMemo(() => {
    if (!data?.features?.length) return EMPTY_GEOJSON;
    const dots = data.features
      .map((f, idx) => {
        const center = polygonCentroid(f.geometry);
        if (!center) return null;
        return {
          type: 'Feature',
          id: `dot-${f.id || idx}`,
          geometry: { type: 'Point', coordinates: center },
          properties: f.properties,
        };
      })
      .filter(Boolean);
    return {
      type: 'FeatureCollection',
      features: dots,
    };
  }, [data]);

  // Force source data update when geoJSON changes
  useEffect(() => {
    if (!map) return;

    const fc = data?.features?.length ?? 0;
    prevCountRef.current = fc;

    try {
      const source = map.getSource('evac-zones');
      if (source && source.type === 'geojson') {
        source.setData(data);
      }
    } catch {
      // source not yet added
    }

    try {
      const dotSource = map.getSource('evac-zones-dots');
      if (dotSource && dotSource.type === 'geojson') {
        dotSource.setData(dotsData);
      }
    } catch {
      // source not yet added
    }
  }, [data, dotsData, map]);

  return (
    <>
      {/* Polygons (fill, hatch, outline, labels) — rendered first, behind dots */}
      <Source
        id="evac-zones"
        type="geojson"
        data={data}
      >
        {/* Polygon fill */}
        <Layer
          id="evac-zones-fill"
          type="fill"
          source="evac-zones"
          layout={{ visibility: vis }}
          paint={{
            'fill-color':   COLOR_MATCH,
            'fill-opacity': OPACITY_MATCH,
          }}
        />

        {/* Diagonal hatch texture overlay */}
        {patternsReady && (
          <Layer
            id="evac-zones-hatch"
            type="fill"
            source="evac-zones"
            layout={{ visibility: vis }}
            paint={{
              'fill-pattern': PATTERN_MATCH,
              'fill-opacity': 0.85,
            }}
          />
        )}

        {/* Bold black boundary */}
        <Layer
          id="evac-zones-line"
          type="line"
          source="evac-zones"
          layout={{ visibility: vis }}
          paint={{
            'line-color':   '#000000',
            'line-width':   LINE_WIDTH_MATCH,
            'line-opacity': 0.95,
          }}
        />

        {/* Zone-name labels at higher zoom */}
        <Layer
          id="evac-zones-label"
          type="symbol"
          source="evac-zones"
          minzoom={8}
          layout={{
            visibility: vis,
            'text-field': ['coalesce', ['get', 'zoneName'], ''],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 13,
            'text-anchor': 'center',
            'text-max-width': 9,
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.05,
          }}
          paint={{
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0,0,0,0.9)',
            'text-halo-width': 2.2,
          }}
        />
      </Source>

      {/* Dot markers at polygon centroids (low zoom) — on top of polygons */}
      <Source id="evac-zones-dots" type="geojson" data={dotsData}>
        <Layer
          id="evac-zones-dot"
          type="circle"
          source="evac-zones-dots"
          maxzoom={6}
          layout={{ visibility: vis }}
          paint={{
            'circle-color':   COLOR_MATCH,
            'circle-opacity': 0.95,
            'circle-radius':  [
              'interpolate', ['linear'], ['zoom'],
              0, 4,
              3, 6,
              5, 8,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 1,
          }}
        />
      </Source>
    </>
  );
}
