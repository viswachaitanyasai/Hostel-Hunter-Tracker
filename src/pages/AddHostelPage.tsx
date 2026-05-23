import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import { useGeolocation } from '../hooks/useGeolocation';
import { createHostel, fileToBase64 } from '../storage';
import { AMENITIES_LIST } from '../types';

const markerIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapCenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], map.getZoom());
  return null;
}

function LocationPicker({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AddHostelPage() {
  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { lat, lng, loading: gpsLoading, error: gpsError, getCurrentPosition } = useGeolocation();

  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [hasAC, setHasAC] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  // Location state
  const [hostelLat, setHostelLat] = useState<number | null>(null);
  const [hostelLng, setHostelLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLocationDetect = () => {
    getCurrentPosition();
  };

  // When GPS updates, set hostel location
  useEffect(() => {
    if (lat && lng && hostelLat === null && hostelLng === null) {
      setHostelLat(lat);
      setHostelLng(lng);
      reverseGeocode(lat, lng).then(setAddress);
    }
  }, [lat, lng, hostelLat, hostelLng]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setHostelLat(newLat);
    setHostelLng(newLng);
    reverseGeocode(newLat, newLng).then(setAddress);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...files]);
    const newPhotos = await Promise.all(files.map(fileToBase64));
    setPhotos((prev) => [...prev, ...newPhotos]);
    // Reset so the same file/camera can be used again
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a hostel name');
      return;
    }
    if (!rent || isNaN(Number(rent)) || Number(rent) <= 0) {
      setError('Please enter a valid rent amount');
      return;
    }
    if (!hostelLat || !hostelLng) {
      setError('Please select a location on the map');
      return;
    }

    setSubmitting(true);
    try {
      await createHostel({
        name: name.trim(),
        rent: Number(rent),
        description: description.trim(),
        contactNumber: contactNumber.trim(),
        hasAC,
        amenities: selectedAmenities,
        photos,
        location: {
          lat: hostelLat,
          lng: hostelLng,
          address: address || `${hostelLat.toFixed(4)}, ${hostelLng.toFixed(4)}`,
        },
      });
      navigate('/');
    } catch (err) {
      setError('Failed to save hostel. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">Add New Hostel</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Photos */}
          <div>
            <label className="input-label">Photos</label>
            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-slate-700 group">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 transition-all duration-200 bg-slate-800/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Camera</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 transition-all duration-200 bg-slate-800/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Gallery</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Camera takes one photo at a time (tap multiple times). Gallery lets you select multiple.
            </p>
            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="input-label" htmlFor="name">Hostel Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunshine Hostel"
              className="input-field"
            />
          </div>

          {/* Rent & AC row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label" htmlFor="rent">Monthly Rent (₹) *</label>
              <input
                id="rent"
                type="number"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                placeholder="5000"
                min="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">AC Available</label>
              <button
                type="button"
                onClick={() => setHasAC(!hasAC)}
                className={`w-full py-3 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
                  hasAC
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {hasAC ? 'AC Included' : 'No AC'}
                </div>
              </button>
            </div>
          </div>

          {/* Contact & Description */}
          <div>
            <label className="input-label" htmlFor="contact">Contact Number</label>
            <input
              id="contact"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="input-field"
            />
          </div>

          <div>
            <label className="input-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the hostel facilities, rooms, rules..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="input-label">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_LIST.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    selectedAmenities.includes(amenity)
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Location *</label>
              <button
                type="button"
                onClick={handleLocationDetect}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                {gpsLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Detecting...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Detect GPS
                  </>
                )}
              </button>
            </div>

            {gpsError && (
              <p className="text-xs text-red-400 mb-2">{gpsError}</p>
            )}

            <div className="h-64 rounded-xl overflow-hidden border border-slate-700 mb-2">
              <MapContainer
                center={[hostelLat || 20.5937, hostelLng || 78.9629]}
                zoom={5}
                className="h-full w-full"
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {hostelLat && hostelLng && (
                  <>
                    <Marker position={[hostelLat, hostelLng]} icon={markerIcon} />
                    <MapCenterUpdater lat={hostelLat} lng={hostelLng} />
                  </>
                )}
                <LocationPicker onLocationChange={handleMapClick} />
              </MapContainer>
            </div>
            <p className="text-xs text-slate-500">Tap on the map to set or adjust location</p>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address..."
              className="input-field mt-2"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2 text-base"
          >
            {submitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Hostel
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
