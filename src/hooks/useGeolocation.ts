import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

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

// Inside the native app shell (Android/iOS) we prefer the Capacitor plugin: it
// uses the platform location provider directly instead of the WebView's
// geolocation bridge. On the web/PWA this stays false and we use the browser API.
const isNative = Capacitor.isNativePlatform();

/** Map native plugin failures onto the same messages the browser API produces. */
function nativeErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (/denied|permission/i.test(message)) return 'Location permission denied. Please enable GPS.';
  if (/timeout/i.test(message)) return 'Location request timed out. Try moving to an open area.';
  if (/disabled|not enabled|unavailable/i.test(message)) return 'Location unavailable. Try again.';
  return message || 'Failed to get location';
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    timestamp: null,
    loading: false,
    error: null,
  });

  const getCurrentPosition = useCallback(async () => {
    if (!isNative && !navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    if (isNative) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');

        // Ask for the runtime permission up front so a denial surfaces as a
        // clear error instead of a bare plugin rejection. Capacitor treats a
        // granted coarse location as enough on Android 12+.
        const current = await Geolocation.checkPermissions();
        if (current.location !== 'granted') {
          const requested = await Geolocation.requestPermissions();
          if (requested.location !== 'granted') {
            setState(prev => ({
              ...prev,
              loading: false,
              error: 'Location permission denied. Please enable GPS.',
            }));
            return;
          }
        }

        const position = await Geolocation.getCurrentPosition(GEO_OPTIONS);
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp || Date.now(),
          loading: false,
          error: null,
        });
      } catch (err) {
        setState(prev => ({ ...prev, loading: false, error: nativeErrorMessage(err) }));
      }
      return;
    }

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
