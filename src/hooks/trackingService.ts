import type { TrackPoint } from '../types';
import { haversineDistance } from '../storage';

type Listener = () => void;

class TrackingService {
  private watchId: number | null = null;
  private _points: TrackPoint[] = [];
  private _startTime: number | null = null;
  private _isTracking = false;
  private _error: string | null = null;
  private lastLat: number | null = null;
  private lastLng: number | null = null;
  private listeners = new Set<Listener>();

  get points(): TrackPoint[] { return this._points; }
  get startTime(): number | null { return this._startTime; }
  get isTracking(): boolean { return this._isTracking; }
  get error(): string | null { return this._error; }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  start() {
    if (this._isTracking) return;
    if (!navigator.geolocation) {
      this._error = 'Geolocation not supported by your browser';
      this.notify();
      return;
    }

    this._points = [];
    this._startTime = Date.now();
    this._isTracking = true;
    this._error = null;
    this.lastLat = null;
    this.lastLng = null;
    this.notify();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Skip if moved less than ~5 meters from last recorded point
        if (this.lastLat !== null && this.lastLng !== null) {
          const dist = haversineDistance(this.lastLat, this.lastLng, latitude, longitude);
          if (dist < 5) return;
        }

        this.lastLat = latitude;
        this.lastLng = longitude;
        this._points = [...this._points, { lat: latitude, lng: longitude, timestamp: Date.now() }];
        this.notify();
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
        this._error = msg;
        this.notify();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 },
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this._isTracking = false;
    this.notify();
  }

  reset() {
    this.stop();
    this._points = [];
    this._startTime = null;
    this._error = null;
    this.lastLat = null;
    this.lastLng = null;
    this.notify();
  }
}

export const trackingService = new TrackingService();
