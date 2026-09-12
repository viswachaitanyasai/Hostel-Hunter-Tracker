import { useState, useCallback } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  // Timestamp of the last successful fix. Bumped on every detect attempt result,
  // so callers can re-apply the pin even when coordinates are identical.
  timestamp: number | null;
  loading: boolean;
  error: string | null;
}

// Long timeout: cold GPS locks (first fix / indoors) can take 15-30s.
// maximumAge: 0 forces a fresh fix instead of a stale cached position.
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0,
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    timestamp: null,
    loading: false,
    error: null,
  });

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp || Date.now(),
          loading: false,
          error: null,
        });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable GPS.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable. Try again.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Try moving to an open area.';
            break;
        }
        setState(prev => ({ ...prev, loading: false, error: message }));
      },
      GEO_OPTIONS,
    );
  }, []);

  const resetLocation = useCallback(() => {
    setState({ lat: null, lng: null, timestamp: null, loading: false, error: null });
  }, []);

  return { ...state, getCurrentPosition, resetLocation };
}
