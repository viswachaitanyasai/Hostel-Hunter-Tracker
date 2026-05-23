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
    <div className="min-w-[200px]">
      {hostel.photos.length > 0 && (
        <img
          src={hostel.photos[0]}
          alt={hostel.name}
          className="w-full h-24 object-cover rounded-lg mb-2"
        />
      )}
      <h3 className="font-semibold text-sm text-slate-800">{hostel.name}</h3>
      <p className="text-blue-600 font-bold text-sm mt-1">₹{cheapestRent.toLocaleString()}/mo</p>
      {hostel.rating > 0 && (
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-3 h-3 ${star <= hostel.rating ? 'text-yellow-400' : 'text-gray-300'}`}
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
          <span key={a} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {a}
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onViewDetails(hostel.id)}
          className="flex-1 text-xs bg-blue-500 text-white py-1.5 rounded-lg hover:bg-blue-600 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={openInGoogleMaps}
          className="flex-shrink-0 text-xs bg-green-500 text-white py-1.5 px-2 rounded-lg hover:bg-green-600 transition-colors"
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

export default function MapPage() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="h-dvh w-full flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex-shrink-0 z-[1000] bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
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
            <h1 className="text-lg font-bold">
              Map View
              {!loading && <span className="text-sm font-normal text-slate-400 ml-1">({hostels.length})</span>}
            </h1>
          </div>
          <button
            onClick={() => navigate('/add')}
            className="p-2 bg-blue-500 hover:bg-blue-400 rounded-xl transition-colors"
            aria-label="Add hostel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading map...</p>
            </div>
          </div>
        ) : hostels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-300 mb-1">No hostels on map</h3>
              <p className="text-sm text-slate-400 mb-4">Add a hostel to see it here</p>
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
          >
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
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
