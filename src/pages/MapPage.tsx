import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { icon } from 'leaflet';
import { listHostels } from '../storage';
import type { Hostel } from '../types';

const markerIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function HostelPopupContent({ hostel, onViewDetails }: { hostel: Hostel; onViewDetails: (id: string) => void }) {
  const openInGoogleMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps?q=${hostel.location.lat},${hostel.location.lng}`;
    window.open(url, '_blank');
  };

  const cheapestRent = hostel.rents.length > 0 ? Math.min(...hostel.rents.map((r) => r.rent)) : 0;

  return (
    <div className="min-w-[200px] lg:min-w-[260px]">
      {hostel.photos.length > 0 && (
        <img
          src={hostel.photos[0]}
          alt={hostel.name}
          className="w-full h-24 object-cover rounded-lg mb-2"
        />
      )}
      <h3 className="font-semibold text-sm text-ink-100">{hostel.name}</h3>
      <p className="text-iris-300 font-bold text-sm mt-1">₹{cheapestRent.toLocaleString()}/mo</p>
      {hostel.roomRating > 0 && (
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-3 h-3 ${star <= hostel.roomRating ? 'text-amber-400' : 'text-ink-700'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {hostel.amenities.slice(0, 3).map((a) => (
          <span key={a} className="text-[10px] bg-ink-800 text-ink-300 border border-white/[0.08] px-1.5 py-0.5 rounded-full">
            {a}
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onViewDetails(hostel.id)}
          className="flex-1 text-xs font-semibold bg-gradient-to-b from-iris-500 to-iris-600 text-white py-1.5 rounded-lg hover:from-iris-400 hover:to-iris-500 transition-all active:scale-95"
        >
          View Details
        </button>
        <button
          onClick={openInGoogleMaps}
          className="flex-shrink-0 text-xs font-semibold bg-emerald-500/90 text-white py-1.5 px-2.5 rounded-lg hover:bg-emerald-500 transition-colors active:scale-95"
          title="Open in Google Maps"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type MapStyle = 'satellite' | 'street';

export default function MapPage() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>('satellite');

  useEffect(() => {
    loadHostels();
  }, []);

  async function loadHostels() {
    try {
      const data = await listHostels();
      setHostels(data);
    } catch (err) {
      console.error('Failed to load hostels:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleViewDetails = useCallback((id: string) => {
    navigate(`/hostel/${id}`);
  }, [navigate]);

  // Calculate center based on hostels or default to India
  const center = hostels.length > 0
    ? [
        hostels.reduce((sum, h) => sum + h.location.lat, 0) / hostels.length,
        hostels.reduce((sum, h) => sum + h.location.lng, 0) / hostels.length,
      ]
    : [20.5937, 78.9629];

  const zoom = hostels.length > 0 ? 12 : 5;

  return (
    <div className="h-dvh w-full flex flex-col bg-ink-950">
      {/* Header */}
      <header className="flex-shrink-0 z-[1000] bg-ink-950/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg lg:max-w-none lg:px-6 mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="icon-btn"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold">
              Map View
              {!loading && <span className="text-sm font-normal text-ink-400 ml-1">({hostels.length})</span>}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMapStyle(prev => prev === 'satellite' ? 'street' : 'satellite')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                mapStyle === 'satellite'
                  ? 'bg-iris-500/15 border-iris-500/40 text-iris-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}
              title="Toggle map style"
            >
              {mapStyle === 'satellite' ? 'Satellite' : 'Street'}
            </button>
            <button
              onClick={() => navigate('/add')}
              className="w-10 h-10 rounded-xl bg-gradient-to-b from-iris-500 to-iris-600 hover:from-iris-400 hover:to-iris-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-iris-500/30"
              aria-label="Add hostel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-iris-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-ink-400">Loading map...</p>
            </div>
          </div>
        ) : hostels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-ink-900 rounded-2xl border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink-100 mb-1">No hostels on map</h3>
              <p className="text-sm text-ink-400 mb-4">Add a hostel to see it here</p>
              <button onClick={() => navigate('/add')} className="btn-primary">
                Add Hostel
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[center[0], center[1]]}
            zoom={zoom}
            className="h-full w-full"
            zoomControl={true}
            maxZoom={18}
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
            {hostels.map((hostel) => (
              <Marker
                key={hostel.id}
                position={[hostel.location.lat, hostel.location.lng]}
                icon={markerIcon}
              >
                <Popup>
                  <HostelPopupContent hostel={hostel} onViewDetails={handleViewDetails} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
