import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import { icon, divIcon } from 'leaflet';
import { useTracking } from '../hooks/useTracking';
import { listRoutes, createRoute, removeRoute } from '../storage';
import type { TrackedRoute } from '../types';

const markerIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const currentLocationIcon = divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(59,130,246,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const startIcon = divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;background:#22c55e;border:2px solid white;border-radius:50%"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const endIcon = divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const countRef = useRef(0);
  useEffect(() => {
    if (points.length > 0 && points.length !== countRef.current) {
      countRef.current = points.length;
      map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    }
  }, [map, points.length]);
  return null;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TrackPage() {
  const navigate = useNavigate();
  const {
    isTracking,
    points,
    startTime,
    error,
    currentDuration,
    currentDistance,
    startTracking,
    stopTracking,
    resetTracking,
  } = useTracking();

  const [savedRoutes, setSavedRoutes] = useState<TrackedRoute[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewingRoute, setViewingRoute] = useState<TrackedRoute | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);

  // Tick the duration counter every second while tracking or showing stopped result
  useEffect(() => {
    if (!viewingRoute && isTracking) {
      const interval = setInterval(() => {
        if (startTime) {
          setLiveDuration(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking, startTime, viewingRoute]);

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    try {
      const routes = await listRoutes();
      setSavedRoutes(routes);
    } catch (err) {
      console.error('Failed to load routes:', err);
    }
  }

  // Build polyline positions from current tracking points or selected past route
  const polylinePositions: [number, number][] = viewingRoute
    ? viewingRoute.points.map(p => [p.lat, p.lng] as [number, number])
    : points.map(p => [p.lat, p.lng] as [number, number]);

  const lastPoint = viewingRoute
    ? [viewingRoute.points[viewingRoute.points.length - 1]?.lat, viewingRoute.points[viewingRoute.points.length - 1]?.lng] as [number, number]
    : points.length > 0
      ? [points[points.length - 1].lat, points[points.length - 1].lng] as [number, number]
      : null;

  const firstPoint = polylinePositions[0] || null;

  const handleSaveRoute = async () => {
    if (points.length < 2) return;
    setSaving(true);
    try {
      const now = new Date();
      const routeName = `Track ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
      await createRoute({
        name: routeName,
        points,
        distance: currentDistance,
        duration: currentDuration,
        startedAt: startTime ? new Date(startTime).toISOString() : now.toISOString(),
        finishedAt: now.toISOString(),
      });
      await loadRoutes();
      resetTracking();
    } catch (err) {
      console.error('Failed to save route:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      await removeRoute(id);
      if (viewingRoute?.id === id) {
        setViewingRoute(null);
        setShowHistory(true);
      }
      await loadRoutes();
    } catch (err) {
      console.error('Failed to delete route:', err);
    }
    setConfirmDelete(null);
  };

  const handleViewRoute = (route: TrackedRoute) => {
    setViewingRoute(route);
    setShowHistory(false);
  };

  const handleBackToLive = () => {
    setViewingRoute(null);
  };

  // Determine map center
  const defaultCenter: [number, number] = lastPoint || [20.5937, 78.9629];
  const defaultZoom = lastPoint ? 15 : 5;

  const isLive = !viewingRoute && (isTracking || points.length === 0);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-[1000] bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold">Track</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* View history button */}
            <button
              onClick={() => { setShowHistory(!showHistory); setViewingRoute(null); }}
              className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Route history"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Start/Stop button */}
            {!viewingRoute && (
              <button
                onClick={isTracking ? stopTracking : startTracking}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isTracking
                    ? 'bg-red-500 hover:bg-red-400 text-white animate-pulse'
                    : 'bg-green-500 hover:bg-green-400 text-white'
                }`}
              >
                {isTracking ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start
                  </>
                )}
              </button>
            )}
            {viewingRoute && (
              <button
                onClick={handleBackToLive}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Live
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative min-h-[300px]">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="h-full w-full"
          zoomControl={true}
          key={isLive ? 'live' : viewingRoute?.id || 'history'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />

          {polylinePositions.length > 1 && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: isTracking ? '#3b82f6' : '#22c55e',
                weight: 4,
                opacity: 0.8,
                dashArray: isTracking ? '10, 6' : undefined,
              }}
            />
          )}

          {firstPoint && (
            <Marker position={firstPoint} icon={startIcon} />
          )}

          {lastPoint && polylinePositions.length > 1 && (
            <Marker position={lastPoint} icon={endIcon} />
          )}

          {/* Current location marker (blue dot) */}
          {isTracking && lastPoint && (
            <Marker position={lastPoint} icon={currentLocationIcon} />
          )}

          {/* Fit bounds to show the full route */}
          {polylinePositions.length > 0 && (
            <FitBounds points={polylinePositions} />
          )}
        </MapContainer>

        {/* Recording indicator overlay */}
        {isTracking && (
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-white font-medium">REC</span>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="absolute top-3 left-3 right-3 z-[1000] bg-red-500/90 backdrop-blur-sm rounded-xl px-4 py-2.5">
            <p className="text-xs text-white">{error}</p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 px-4 py-3">
        <div className="max-w-lg mx-auto">
          {viewingRoute ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{viewingRoute.name}</p>
                <p className="text-xs text-slate-500">{formatTime(viewingRoute.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{formatDuration(viewingRoute.duration)}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Time</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-400">{formatDistance(viewingRoute.distance)}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-400">{viewingRoute.points.length}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Points</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  {isTracking ? 'Recording...' : points.length > 0 ? 'Recording stopped' : 'Tap Start to begin'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{formatDuration(liveDuration)}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Time</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-400">{formatDistance(currentDistance)}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-400">{points.length}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Points</p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons after stop */}
          {!isTracking && points.length >= 2 && !viewingRoute && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveRoute}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white py-2 rounded-xl text-sm font-bold transition-all"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Route
                  </>
                )}
              </button>
              <button
                onClick={resetTracking}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 max-h-[40vh] overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Route History</h2>
              <span className="text-xs text-slate-500">{savedRoutes.length} routes</span>
            </div>

            {savedRoutes.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400">No saved routes yet</p>
                <p className="text-xs text-slate-500 mt-1">Start tracking to create your first route</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedRoutes.map((route) => (
                  <div
                    key={route.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      viewingRoute?.id === route.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => handleViewRoute(route)}
                  >
                    {/* Thumbnail map */}
                    <div className="w-12 h-12 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{route.name}</p>
                      <p className="text-xs text-slate-400">{formatTime(route.createdAt)}</p>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">{formatDistance(route.distance)}</span>
                        <span className="text-xs text-slate-500">{formatDuration(route.duration)}</span>
                        <span className="text-xs text-slate-500">{route.points.length} pts</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(route.id); }}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center px-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-slate-800 rounded-2xl p-5 max-w-xs w-full border border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-2">Delete Route?</h3>
            <p className="text-xs text-slate-400 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRoute(confirmDelete)}
                className="flex-1 py-2 bg-red-500 hover:bg-red-400 rounded-xl text-sm font-bold text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
