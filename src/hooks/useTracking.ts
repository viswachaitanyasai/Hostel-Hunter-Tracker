import { useState, useEffect } from 'react';
import { trackingService } from './trackingService';

export function useTracking() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return trackingService.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const points = trackingService.points;
  const startTime = trackingService.startTime;
  const isTracking = trackingService.isTracking;
  const error = trackingService.error;

  const currentDuration = startTime
    ? Math.floor((Date.now() - startTime) / 1000)
    : 0;

  const currentDistance = calculateDistance(points);

  return {
    isTracking,
    points,
    startTime,
    error,
    currentDuration,
    currentDistance,
    startTracking: () => trackingService.start(),
    stopTracking: () => trackingService.stop(),
    resetTracking: () => trackingService.reset(),
  };
}

function calculateDistance(points: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng,
    );
  }
  return total;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
