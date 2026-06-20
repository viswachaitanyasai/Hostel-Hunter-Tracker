import { useState, useEffect, useRef } from 'react';
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

function StarRatingDisplay({ value, maxStars = 5 }: { value: number; maxStars?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= value ? 'text-yellow-400' : 'text-slate-600'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {value > 0 && <span className="text-xs text-slate-400 ml-1">{value}/{maxStars}</span>}
    </div>
  );
}

export default function HostelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0 });
  const fullScreenTouchRef = useRef({ startX: 0, startY: 0 });
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

  const openInGoogleMaps = () => {
    if (!hostel) return;
    const url = `https://www.google.com/maps?q=${hostel.location.lat},${hostel.location.lng}`;
    window.open(url, '_blank');
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

  const cheapestRent = hostel.rents.length > 0 ? Math.min(...hostel.rents.map((r) => r.rent)) : 0;

  return (
    <div className="min-h-screen bg-slate-900 pb-8">
      {/* Header */}
      <header className="relative">
        {/* Photo gallery with swipe */}
        <div
          className="relative h-72 bg-slate-800 select-none group"
          onTouchStart={(e) => {
            touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
          }}
          onTouchMove={(e) => {
            if (!hostel.photos.length) return;
            const deltaX = e.touches[0].clientX - touchRef.current.startX;
            const deltaY = Math.abs(e.touches[0].clientY - touchRef.current.startY);
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
              e.preventDefault();
            }
          }}
          onTouchEnd={(e) => {
            if (!hostel.photos.length) return;
            const deltaX = e.changedTouches[0].clientX - touchRef.current.startX;
            const deltaY = Math.abs(e.changedTouches[0].clientY - touchRef.current.startY);
            const threshold = 50;
            if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX < 0) {
                setSelectedPhoto((prev) => Math.min(prev + 1, hostel.photos.length - 1));
              } else {
                setSelectedPhoto((prev) => Math.max(prev - 1, 0));
              }
            }
          }}
        >
          {hostel.photos.length > 0 ? (
            <>
              <button
                onClick={() => setShowFullScreen(true)}
                className="w-full h-full block focus:outline-none cursor-pointer"
                aria-label="View full screen"
              >
                <img
                  src={hostel.photos[selectedPhoto]}
                  alt={hostel.name}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              </button>
              {/* Arrow navigation for desktop */}
              {hostel.photos.length > 1 && (
                <>
                  {selectedPhoto > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto((prev) => prev - 1); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {selectedPhoto < hostel.photos.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto((prev) => prev + 1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              {/* Full screen hint */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Tap to view full screen
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-20 h-20 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent pointer-events-none" />

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

          {/* Edit button */}
          <button
            onClick={() => navigate(`/edit/${hostel.id}`)}
            className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-sm rounded-xl hover:bg-blue-500/40 transition-colors z-10"
            aria-label="Edit hostel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-white">{hostel.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  hostel.type === 'boys'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}>
                  {hostel.type === 'boys' ? 'Boys' : 'Co-living'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{hostel.location.address}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-blue-400">₹{cheapestRent.toLocaleString()}</p>
              <p className="text-xs text-slate-500">starting price</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
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
            {hostel.rents.length > 0 && (
              <span className="tag">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {hostel.rents.length} sharing options
              </span>
            )}
          </div>
        </div>

        {/* Ratings Section */}
        {(hostel.roomRating > 0 || hostel.peopleRating > 0 || hostel.googleMapsRating > 0 || hostel.ownerRating > 0) && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Ratings</h2>
            <div className="grid grid-cols-2 gap-3">
              {hostel.roomRating > 0 && (
                <div className="py-3 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">Room</p>
                  <StarRatingDisplay value={hostel.roomRating} maxStars={5} />
                </div>
              )}
              {hostel.peopleRating > 0 && (
                <div className="py-3 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">People/Vibe</p>
                  <StarRatingDisplay value={hostel.peopleRating} maxStars={5} />
                </div>
              )}
              {hostel.googleMapsRating > 0 && (
                <div className="py-3 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">Google Maps</p>
                  <StarRatingDisplay value={hostel.googleMapsRating} maxStars={5} />
                </div>
              )}
              {hostel.ownerRating > 0 && (
                <div className="py-3 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">Owner</p>
                  <StarRatingDisplay value={hostel.ownerRating} maxStars={3} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rent Breakdown */}
        {hostel.rents.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Rent Options</h2>
            <div className="space-y-2">
              {hostel.rents.map((rentItem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50"
                >
                  <span className="text-sm text-slate-300">
                    <span className="font-semibold text-white">{rentItem.shares}</span>{' '}
                    {rentItem.shares === 1 ? 'Person' : 'People'} per Room
                  </span>
                  <span className="text-sm font-bold text-blue-400">₹{rentItem.rent.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Food & Electricity Info */}
        {(hostel.foodIncluded !== undefined || hostel.electricityType) && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Food & Electricity</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="py-3 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium mb-1">Food</p>
                {hostel.foodIncluded ? (
                  <p className="text-sm font-semibold text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Included
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-white">
                    {hostel.foodCharges > 0 ? `₹${hostel.foodCharges}/mo` : 'Not Included'}
                  </p>
                )}
              </div>
              <div className="py-3 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium mb-1">Electricity</p>
                {hostel.electricityType === 'included' ? (
                  <p className="text-sm font-semibold text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Included
                  </p>
                ) : hostel.electricityType === 'fixed' ? (
                  <p className="text-sm font-semibold text-white">₹{hostel.electricityAmount}/mo <span className="text-xs text-amber-400">(Fixed)</span></p>
                ) : (
                  <p className="text-sm font-semibold text-white">₹{hostel.electricityAmount}/unit <span className="text-xs text-amber-400">(Per Unit)</span></p>
                )}
              </div>
            </div>
          </div>
        )}

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

        {/* Security Fee & Fines */}
        {(hostel.securityFee > 0 || hostel.otherFines || hostel.lockInPeriod > 0 || hostel.noticePeriod > 0) && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Fees & Policies</h2>
            {hostel.securityFee > 0 && (
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50 mb-2">
                <span className="text-sm text-slate-300">Security Fee</span>
                <span className="text-sm font-bold text-amber-400">₹{hostel.securityFee.toLocaleString()}</span>
              </div>
            )}
            {/* Lock-in & Notice Periods */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {hostel.lockInPeriod > 0 && (
                <div className="py-2 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium">Lock-in Period</p>
                  <p className="text-sm font-semibold text-white">{hostel.lockInPeriod} {hostel.lockInPeriod === 1 ? 'Month' : 'Months'}</p>
                </div>
              )}
              {hostel.noticePeriod > 0 && (
                <div className="py-2 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium">Notice Period</p>
                  <p className="text-sm font-semibold text-white">{hostel.noticePeriod} {hostel.noticePeriod === 1 ? 'Month' : 'Months'}</p>
                </div>
              )}
            </div>
            {hostel.otherFines && (
              <div className="py-2 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                <p className="text-xs text-slate-400 font-medium mb-1">Other Fines & Rules</p>
                <p className="text-sm text-slate-300">{hostel.otherFines}</p>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Location</h2>
            <button
              onClick={openInGoogleMaps}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Google Maps
            </button>
          </div>
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
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
              <Marker position={[hostel.location.lat, hostel.location.lng]} icon={markerIcon}>
                <Popup>{hostel.name}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => navigate('/map')}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            View on Map
          </button>
          <button
            onClick={() => navigate(`/edit/${hostel.id}`)}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger col-span-2 flex items-center justify-center gap-2"
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

      {/* Full screen photo viewer */}
      {showFullScreen && hostel.photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setShowFullScreen(false)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Close full screen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm text-white/60 font-medium">
              {selectedPhoto + 1} / {hostel.photos.length}
            </span>
            {/* Download button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const filename = `${hostel.name.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedPhoto + 1}.jpg`;
                const dataUrl = hostel.photos[selectedPhoto];
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Download photo"
              title="Download photo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>

          {/* Image area with swipe */}
          <div
            className="flex-1 flex items-center justify-center select-none relative"
            onTouchStart={(e) => {
              fullScreenTouchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
            }}
            onTouchMove={(e) => {
              const deltaX = e.touches[0].clientX - fullScreenTouchRef.current.startX;
              const deltaY = Math.abs(e.touches[0].clientY - fullScreenTouchRef.current.startY);
              if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                e.preventDefault();
              }
            }}
            onTouchEnd={(e) => {
              const deltaX = e.changedTouches[0].clientX - fullScreenTouchRef.current.startX;
              const deltaY = Math.abs(e.changedTouches[0].clientY - fullScreenTouchRef.current.startY);
              const threshold = 50;
              if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX < 0) {
                  setSelectedPhoto((prev) => Math.min(prev + 1, hostel.photos.length - 1));
                } else {
                  setSelectedPhoto((prev) => Math.max(prev - 1, 0));
                }
              }
            }}
          >
            <img
              src={hostel.photos[selectedPhoto]}
              alt={hostel.name}
              className="max-h-full max-w-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Desktop arrows */}
            {hostel.photos.length > 1 && (
              <>
                {selectedPhoto > 0 && (
                  <button
                    onClick={() => setSelectedPhoto((prev) => prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    aria-label="Previous photo"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {selectedPhoto < hostel.photos.length - 1 && (
                  <button
                    onClick={() => setSelectedPhoto((prev) => prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    aria-label="Next photo"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Photo dots strip */}
          <div className="flex items-center justify-center gap-1.5 px-4 py-4">
            {hostel.photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedPhoto(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  index === selectedPhoto ? 'w-5 bg-white' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

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
