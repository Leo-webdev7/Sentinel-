import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFirePerimeters } from './useFirePerimeters';
import * as nifc from '../api/nifc';

vi.mock('../api/nifc');

beforeEach(() => {
  vi.restoreAllMocks();
});

const mockGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[-120, 37], [-120, 38], [-119, 38], [-119, 37], [-120, 37]]] },
      properties: { IncidentName: 'Test Fire', GISAcres: 5000 },
    },
  ],
};

describe('useFirePerimeters', () => {
  it('fetches perimeters on mount', async () => {
    nifc.fetchFirePerimeters.mockResolvedValue(mockGeoJSON);

    const { result } = renderHook(() => useFirePerimeters());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.geoJSON).toEqual(mockGeoJSON);
    expect(result.current.count).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    nifc.fetchFirePerimeters.mockRejectedValue(new Error('ArcGIS timeout'));

    const { result } = renderHook(() => useFirePerimeters());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('ArcGIS timeout');
    expect(result.current.geoJSON).toBeNull();
    expect(result.current.count).toBe(0);
  });

  it('passes minAcres through to API', async () => {
    nifc.fetchFirePerimeters.mockResolvedValue({ type: 'FeatureCollection', features: [] });

    const { result } = renderHook(() => useFirePerimeters(500));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(nifc.fetchFirePerimeters).toHaveBeenCalledWith({ minAcres: 500 });
  });

  it('refresh function re-fetches data', async () => {
    nifc.fetchFirePerimeters.mockResolvedValue(mockGeoJSON);

    const { result } = renderHook(() => useFirePerimeters());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(1);

    nifc.fetchFirePerimeters.mockResolvedValue({ type: 'FeatureCollection', features: [] });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.count).toBe(0);
  });

  it('handles null features gracefully', async () => {
    nifc.fetchFirePerimeters.mockResolvedValue(null);

    const { result } = renderHook(() => useFirePerimeters());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.geoJSON).toBeNull();
    expect(result.current.count).toBe(0);
  });
});
