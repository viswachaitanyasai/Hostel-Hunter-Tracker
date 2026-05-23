import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { icon } from 'leaflet';
import { getHostelById, removeHostel } from '../storage';
import type { Hostel } from '../types';

const markerIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function HostelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) loadHostel(id);
  }, [id]);

  async function loadHostel(hostelId: string) {
    try {
      const data = await getHostelById(hostelId);
      setHostel(data);
    } catch (err) {
      console.error('Failed to load hostel:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await removeHostel(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-300 mb-1">Hostel not found</h2>
        <p className="text-sm text-slate-400 mb-4">This hostel may have been removed</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-8">
      {/* Header */}
      <header className="relative">
        {/* Photo gallery */}
        <div className="relative h-72 bg-slate-800">
          {hostel.photos.length > 0 ? (
            <img
              src={hostel.photos[selectedPhoto]}
              alt={hostel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-20 h-20 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 p-2.5 bg-black/40 backdrop-blur-sm rounded-xl hover:bg-black/60 transition-colors z-10"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Photo strip */}
          {hostel.photos.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-1.5 overflow-x-auto pb-1">
              {hostel.photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhoto(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 flex-shrink-0 ${
                    index === selectedPhoto ? 'w-6 bg-white' : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-10 space-y-4">
        {/* Name & Rent */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{hostel.name}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{hostel.location.address}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-blue-400">₹{hostel.rent.toLocaleString()}</p>
              <p className="text-xs text-slate-500">per month</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-4">
            {hostel.hasAC && (
              <span className="tag text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                AC
              </span>
            )}
            {hostel.contactNumber && (
              <a
                href={`tel:${hostel.contactNumber}`}
                className="tag hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call
              </a>
            )}
          </div>
        </div>

        {/* Description */}
        {hostel.description && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">About</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{hostel.description}</p>
          </div>
        )}

        {/* Amenities */}
        {hostel.amenities.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {hostel.amenities.map((amenity) => (
                <span key={amenity} className="tag bg-blue-500/10 border-blue-500/30 text-blue-400">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Location</h2>
          <div className="h-48 rounded-xl overflow-hidden border border-slate-700">
            <MapContainer
              center={[hostel.location.lat, hostel.location.lng]}
              zoom={15}
              className="h-full w-full"
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[hostel.location.lat, hostel.location.lng]} icon={markerIcon}>
                <Popup>{hostel.name}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => navigate('/map')}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            View on Map
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>

        {/* Timestamps */}
        <p className="text-xs text-slate-600 text-center pt-2">
          Added {new Date(hostel.createdAt).toLocaleDateString()}
          {hostel.createdAt !== hostel.updatedAt && ` · Updated ${new Date(hostel.updatedAt).toLocaleDateString()}`}
        </p>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Delete Hostel?</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              Are you sure you want to delete "{hostel.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
