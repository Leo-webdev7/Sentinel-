/**
 * Mapbox 3D buildings.
 *
 * Building footprints from the Mapbox Streets v8 tileset are extruded with a
 * `fill-extrusion` layer. A dedicated vector source is used (instead of the
 * classic `composite` source) so the layer works on both base styles:
 * the dark-v11 rendered view AND the Mapbox Standard Satellite view, which
 * doesn't expose classic style sources.
 *
 * On the satellite view, the Standard style's own built-in 3D objects are
 * suppressed so the toggle-controlled extrusions are the single source of
 * buildings (avoids double-rendered / z-fighting geometry).
 *
 * No-op on the token-less Carto fallback basemap (no building data available).
 */

import { memo, useEffect } from 'react';
import { Source, Layer, useMap } from 'react-map-gl';

const Buildings3DLayer = memo(function Buildings3DLayer({ visible, mapType, hasMapboxToken }) {
  const { current: mapRef } = useMap();
  const isStandardStyle = hasMapboxToken && mapType === 'satellite';

  useEffect(() => {
    if (!mapRef || !isStandardStyle) return undefined;
    const map = mapRef.getMap();

    const apply = () => {
      try {
        map.setConfigProperty('basemap', 'show3dObjects', false);
      } catch {
        // Style not parsed yet — the style.load listener below retries.
      }
    };

    apply();
    map.on('style.load', apply);
    return () => { map.off('style.load', apply); };
  }, [mapRef, isStandardStyle]);

  if (!hasMapboxToken) return null;

  return (
    <Source id="mapbox-buildings" type="vector" url="mapbox://mapbox.mapbox-streets-v8">
      <Layer
        id="buildings-3d-extrusion"
        type="fill-extrusion"
        source-layer="building"
        minzoom={13}
        filter={[
          'all',
          ['==', ['get', 'extrude'], 'true'],
          ['!=', ['get', 'underground'], 'true'],
        ]}
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
          'fill-extrusion-opacity': 1,
        }}
      />
    </Source>
  );
});

export default Buildings3DLayer;
