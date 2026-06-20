import { useState, useRef, useCallback, useEffect } from 'react';
import type { TrackPoint } from '../types';
import { haversineDistance } from '../storage';

interface TrackingState {
  isTracking: boolean;
  points: TrackPoint[];
  startTime: number | null;
  error: string | null;
}

export function useTracking() {
  const [state, setState] = useState<TrackingState>({
    isTracking: false,
    points: [],
    startTime: null,
    error: null,
  });
  const watchIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<TrackPoint | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported by your browser' }));
      return;
    }

    const now = Date.now();
    lastPointRef.current = null;
    setState({
      isTracking: true,
      points: [],
      startTime: now,
      error: null,
    });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point: TrackPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        };

        // Skip if moved less than ~5 meters from last recorded point
        if (lastPointRef.current) {
          const dist = haversineDistance(
            lastPointRef.current.lat, lastPointRef.current.lng,
            point.lat, point.lng,
          );
          if (dist < 5) return;
        }

        lastPointRef.current = point;
        setState(prev => {
          if (!prev.isTracking) return prev;
          return { ...prev, points: [...prev.points, point] };
        });
      },
      (error) => {
        let msg = 'Failed to get GPS location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied. Please enable GPS.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'GPS signal unavailable. Try moving outdoors.';
            break;
          case error.TIMEOUT:
            msg = 'GPS request timed out.';
            break;
        }
        setState(prev => ({ ...prev, error: msg }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 },
    );

    watchIdRef.current = watchId;
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({ ...prev, isTracking: false }));
  }, []);

  const resetTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastPointRef.current = null;
    setState({ isTracking: false, points: [], startTime: null, error: null });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const currentDuration = state.startTime
    ? Math.floor((Date.now() - state.startTime) / 1000)
    : 0;

  const currentDistance = calculateDistance(state.points);

  return {
    ...state,
    currentDuration,
    currentDistance,
    startTracking,
    stopTracking,
    resetTracking,
  };
}

function calculateDistance(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng,
    );
  }
  return total;
}
