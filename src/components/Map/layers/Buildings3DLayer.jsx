/**
 * Mapbox 3D buildings.
 *
 * Satellite view (Mapbox Standard Satellite): 3D buildings/landmarks are baked
 * into the basemap, so they're toggled through the style's `show3dObjects`
 * config property rather than a layer.
 *
 * Rendered view (dark-v11 classic style): building footprints from the Mapbox
 * Streets `building` source-layer are extruded with a `fill-extrusion` layer.
 *
 * No-op on the token-less Carto fallback basemap (no building data available).
 */

import { memo, useEffect } from 'react';
import { Layer, useMap } from 'react-map-gl';

const Buildings3DLayer = memo(function Buildings3DLayer({ visible, mapType, hasMapboxToken }) {
  const { current: mapRef } = useMap();
  const isStandardStyle = hasMapboxToken && mapType === 'satellite';

  useEffect(() => {
    if (!mapRef || !isStandardStyle) return undefined;
    const map = mapRef.getMap();

    const apply = () => {
      try {
        map.setConfigProperty('basemap', 'show3dObjects', visible);
      } catch {
        // Style not parsed yet — the style.load listener below retries.
      }
    };

    apply();
    map.on('style.load', apply);
    return () => { map.off('style.load', apply); };
  }, [mapRef, isStandardStyle, visible]);

  if (!hasMapboxToken || mapType !== 'rendered') return null;

  return (
    <Layer
      id="buildings-3d-extrusion"
      type="fill-extrusion"
      source="composite"
      source-layer="building"
      minzoom={13}
      filter={['==', ['get', 'extrude'], 'true']}
      layout={{ visibility: visible ? 'visible' : 'none' }}
      paint={{
        'fill-extrusion-color': '#52525b',
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          13, 0,
          14.05, ['get', 'height'],
        ],
        'fill-extrusion-base': [
          'interpolate', ['linear'], ['zoom'],
          13, 0,
          14.05, ['get', 'min_height'],
        ],
        'fill-extrusion-opacity': 0.75,
      }}
    />
  );
});

export default Buildings3DLayer;
