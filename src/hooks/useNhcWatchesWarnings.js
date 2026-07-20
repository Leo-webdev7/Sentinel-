/**
 * useNhcWatchesWarnings.js
 * React hook for NHC coastal watch/warning breakpoints.
 * Polls fetchNhcWatchesWarnings() every 10 minutes when enabled.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNhcWatchesWarnings } from '../api/nhcTropicalWeather';

const REFRESH_INTERVAL = 10 * 60 * 1000;
const EMPTY_FC = { type: 'FeatureCollection', features: [] };

export function useNhcWatchesWarnings(enabled = false) {
  const [geoJSON, setGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await fetchNhcWatchesWarnings();
      if (!mountedRef.current) return;
      setGeoJSON(data ?? EMPTY_FC);
    } catch (err) {
      console.warn('[useNhcWatchesWarnings]', err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      setGeoJSON(null);
      return;
    }
    load();
    const interval = setInterval(load, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [enabled, load]);

  return { geoJSON, loading, refresh: load };
}
