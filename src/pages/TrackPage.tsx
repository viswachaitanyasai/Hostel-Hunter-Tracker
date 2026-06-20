import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const ROUTE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function FitBounds({ allPoints }: { allPoints: [number, number][] }) {
  const map = useMap();
  const lenRef = useRef(0);
  useEffect(() => {
    if (allPoints.length > 0 && allPoints.length !== lenRef.current) {
      lenRef.current = allPoints.length;
      map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 18 });
    }
  }, [map, allPoints.length]);
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

// ── Bottom Nav Icons ──────────────────────────────────────────

function HomeIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function TrackNavIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function MapNavIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

const bottomNav = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/track', label: 'Track', icon: TrackNavIcon },
  { to: '/map', label: 'Map', icon: MapNavIcon },
];

export default function TrackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isTracking,
    points,
    startTime,
    error,
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
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [showingMultiRoutes, setShowingMultiRoutes] = useState(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'street'>('satellite');

  // Tick the duration counter every second while actively tracking
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
    if (!showingMultiRoutes) {
      loadRoutes();
    }
  }, [showingMultiRoutes]);

  async function loadRoutes() {
    try {
      const routes = await listRoutes();
      setSavedRoutes(routes);
    } catch (err) {
      console.error('Failed to load routes:', err);
    }
  }

  // Selected routes for multi-route view
  const selectedRoutes = savedRoutes.filter(r => selectedRouteIds.has(r.id));

  // Build all polyline points for FitBounds
  const allPolylinePoints: [number, number][] = showingMultiRoutes
    ? selectedRoutes.flatMap(r => r.points.map(p => [p.lat, p.lng] as [number, number]))
    : viewingRoute
      ? viewingRoute.points.map(p => [p.lat, p.lng] as [number, number])
      : points.map(p => [p.lat, p.lng] as [number, number]);

  const lastPoint = viewingRoute
    ? [viewingRoute.points[viewingRoute.points.length - 1]?.lat, viewingRoute.points[viewingRoute.points.length - 1]?.lng] as [number, number]
    : points.length > 0
      ? [points[points.length - 1].lat, points[points.length - 1].lng] as [number, number]
      : null;

  const firstPoint = !showingMultiRoutes && (viewingRoute?.points[0] || points[0])
    ? [
        viewingRoute ? viewingRoute.points[0].lat : points[0].lat,
        viewingRoute ? viewingRoute.points[0].lng : points[0].lng,
      ] as [number, number]
    : null;

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
        duration: liveDuration,
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
    setShowingMultiRoutes(false);
    setSelectedRouteIds(new Set());
  };

  const toggleRouteSelection = (id: string) => {
    setSelectedRouteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleShowSelectedOnMap = () => {
    if (selectedRouteIds.size === 0) return;
    setShowingMultiRoutes(true);
    setShowHistory(false);
  };

  const defaultCenter: [number, number] = allPolylinePoints[0] || [20.5937, 78.9629];
  const defaultZoom = allPolylinePoints.length > 0 ? 15 : 5;
  const isLive = !viewingRoute && !showingMultiRoutes && (isTracking || points.length === 0);
  const isShowingRoutes = showingMultiRoutes || !!viewingRoute;

  return (
    <div className="h-dvh w-full flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex-shrink-0 z-[1000] bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
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
            {/* Map style toggle */}
            <button
              onClick={() => setMapStyle(prev => prev === 'satellite' ? 'street' : 'satellite')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                mapStyle === 'satellite'
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                  : 'bg-green-500/20 border-green-500/30 text-green-400'
              }`}
              title="Toggle map style"
            >
              {mapStyle === 'satellite' ? 'Satellite' : 'Street'}
            </button>

            {/* View history button */}
            {!showingMultiRoutes && (
              <button
                onClick={() => { setShowHistory(!showHistory); setViewingRoute(null); }}
                className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Route history"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            {/* Start/Stop button */}
            {!isShowingRoutes && (
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
            {(viewingRoute || showingMultiRoutes) && (
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
      <div className="flex-1 relative">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="h-full w-full"
          zoomControl={true}
          maxZoom={18}
          key={isLive ? 'live' : viewingRoute?.id || 'history'}
        >
          {mapStyle === 'satellite' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {/* Multi-route polylines */}
          {showingMultiRoutes && selectedRoutes.map((route, idx) => {
            const positions = route.points.map(p => [p.lat, p.lng] as [number, number]);
            const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
            return positions.length > 1 ? (
              <Polyline
                key={route.id}
                positions={positions}
                pathOptions={{ color, weight: 4, opacity: 0.8 }}
              />
            ) : null;
          })}

          {/* Single route polyline */}
          {!showingMultiRoutes && allPolylinePoints.length > 1 && (
            <Polyline
              positions={allPolylinePoints}
              pathOptions={{
                color: isTracking ? '#3b82f6' : '#22c55e',
                weight: 4,
                opacity: 0.8,
                dashArray: isTracking ? '10, 6' : undefined,
              }}
            />
          )}

          {!showingMultiRoutes && firstPoint && <Marker position={firstPoint} icon={startIcon} />}
          {!showingMultiRoutes && lastPoint && allPolylinePoints.length > 1 && <Marker position={lastPoint} icon={endIcon} />}

          {isTracking && lastPoint && <Marker position={lastPoint} icon={currentLocationIcon} />}

          {allPolylinePoints.length > 0 && <FitBounds allPoints={allPolylinePoints} />}
        </MapContainer>

        {/* Recording indicator */}
        {isTracking && (
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-white font-medium">REC</span>
          </div>
        )}

        {/* Multi-route legend */}
        {showingMultiRoutes && selectedRoutes.length > 0 && (
          <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap gap-1.5">
            {selectedRoutes.map((route, idx) => (
              <div
                key={route.id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs"
                style={{ color: ROUTE_COLORS[idx % ROUTE_COLORS.length] }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROUTE_COLORS[idx % ROUTE_COLORS.length] }} />
                <span className="text-white font-medium truncate max-w-[100px]">{route.name}</span>
              </div>
            ))}
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
      <div className="flex-shrink-0 bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 px-4 py-3">
        <div className="max-w-lg mx-auto">
          {showingMultiRoutes ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{selectedRoutes.length} route{selectedRoutes.length !== 1 ? 's' : ''} selected</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">
                    {formatDistance(selectedRoutes.reduce((sum, r) => sum + r.distance, 0))}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Dist</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-400">
                    {selectedRoutes.reduce((sum, r) => sum + r.points.length, 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Points</p>
                </div>
              </div>
            </div>
          ) : viewingRoute ? (
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

          {/* Save / Discard after stop */}
          {!isTracking && points.length >= 2 && !isShowingRoutes && (
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
        <div className="flex-shrink-0 bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 max-h-[40vh] overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Route History</h2>
              <div className="flex items-center gap-2">
                {selectedRouteIds.size > 0 && (
                  <button
                    onClick={handleShowSelectedOnMap}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Show {selectedRouteIds.size} on Map
                  </button>
                )}
                <span className="text-xs text-slate-500">{savedRoutes.length} routes</span>
              </div>
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
                {savedRoutes.map((route, idx) => {
                  const isSelected = selectedRouteIds.has(route.id);
                  return (
                    <div
                      key={route.id}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        viewingRoute?.id === route.id
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {/* Checkbox for multi-select */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleRouteSelection(route.id); }}
                        className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-slate-500 hover:border-blue-400'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Route info - click to view single route */}
                      <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => handleViewRoute(route)}>
                        <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {isSelected ? (
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ROUTE_COLORS[selectedRoutes.findIndex(r => r.id === route.id) % ROUTE_COLORS.length] }} />
                          ) : (
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{route.name}</p>
                          <p className="text-xs text-slate-400">{formatTime(route.createdAt)}</p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">{formatDistance(route.distance)}</span>
                            <span className="text-xs text-slate-500">{formatDuration(route.duration)}</span>
                          </div>
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          {bottomNav.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon active={isActive} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

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
