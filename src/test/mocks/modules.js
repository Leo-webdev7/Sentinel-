import { vi } from 'vitest';

vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      getSource: vi.fn(),
      getLayer: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      fitBounds: vi.fn(),
      flyTo: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      getCenter: vi.fn(() => ({ lng: -119.5, lat: 37.5 })),
      getZoom: vi.fn(() => 6),
      resize: vi.fn(),
      project: vi.fn(() => ({ x: 0, y: 0 })),
      unproject: vi.fn(() => ({ lng: -119.5, lat: 37.5 })),
      queryRenderedFeatures: vi.fn(() => []),
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    GeolocateControl: vi.fn(),
    Popup: vi.fn(() => ({
      setDOMContent: vi.fn(),
      setLngLat: vi.fn(),
      addTo: vi.fn(),
      remove: vi.fn(),
    })),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn(),
      setPopup: vi.fn(),
      addTo: vi.fn(),
      remove: vi.fn(),
    })),
  },
}));

vi.mock('react-map-gl', () => ({
  default: ({ children }) => children,
  MapContext: { Provider: ({ children }) => children },
  NavigationControl: () => null,
  ScaleControl: () => null,
  Source: ({ children }) => children,
  Layer: () => null,
  Popup: ({ children }) => children,
  Marker: ({ children }) => children,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn(),
    })),
  })),
}));
