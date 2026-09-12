import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import { useGeolocation } from '../hooks/useGeolocation';
import { createHostel, updateHostel, getHostelById, fileToBase64 } from '../storage';
import { AMENITIES_LIST, SHARE_OPTIONS } from '../types';
import type { HostelRent, HostelType, ElectricityType } from '../types';

const markerIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

/**
 * Recenters + zooms the map to the pin every time a new GPS fix is applied
 * (keyed on gpsFixTime so repeated detects re-center even at the same coords).
 */
function MapCenterUpdater({ lat, lng, gpsFixTime }: { lat: number; lng: number; gpsFixTime: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (gpsFixTime !== null) {
      map.setView([lat, lng], 16);
    }
  }, [gpsFixTime, lat, lng, map]);
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

function StarRating({ value, onChange, maxStars = 5 }: { value: number; onChange?: (v: number) => void; maxStars?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={`transition-all duration-150 ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <svg
            className={`w-6 h-6 transition-colors ${star <= value ? 'text-amber-400' : 'text-ink-700 hover:text-ink-600'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function formatIndianNumber(numStr: string): string {
  if (!numStr) return '';
  const num = Number(numStr);
  if (isNaN(num)) return numStr;
  return new Intl.NumberFormat('en-IN').format(num);
}

function stripNonDigits(val: string): string {
  let out = '';
  for (let i = 0; i < val.length; i++) {
    const c = val.charCodeAt(i);
    if (c >= 48 && c <= 57) out += val[i];
  }
  return out;
}

export default function AddHostelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const {
    lat: gpsLat,
    lng: gpsLng,
    timestamp: gpsTimestamp,
    loading: gpsLoading,
    error: gpsError,
    getCurrentPosition,
    resetLocation: resetGps,
  } = useGeolocation();

  const isEditing = !!id;

  const [name, setName] = useState('');
  const [hostelType, setHostelType] = useState<HostelType>('boys');
  const [rents, setRents] = useState<HostelRent[]>([]);
  const [securityFee, setSecurityFee] = useState('');
  const [otherFines, setOtherFines] = useState('');
  // Ratings
  const [roomRating, setRoomRating] = useState(0);
  const [peopleRating, setPeopleRating] = useState(0);
  const [ownerRating, setOwnerRating] = useState(0);
  const [googleMapsRating, setGoogleMapsRating] = useState(0);
  // Existing fields
  const [lockInPeriod, setLockInPeriod] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [foodIncluded, setFoodIncluded] = useState(true);
  const [foodCharges, setFoodCharges] = useState('');
  const [electricityType, setElectricityType] = useState<ElectricityType>('included');
  const [electricityAmount, setElectricityAmount] = useState('');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Location state
  const [hostelLat, setHostelLat] = useState<number | null>(null);
  const [hostelLng, setHostelLng] = useState<number | null>(null);
  const [gpsFixTime, setGpsFixTime] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Load existing hostel data for editing
  useEffect(() => {
    if (id) {
      setLoadingEdit(true);
      getHostelById(id)
        .then((hostel) => {
          if (!hostel) {
            setError('Hostel not found');
            return;
          }
          setName(hostel.name);
          setHostelType(hostel.type || 'coliving');
          setRents(hostel.rents);
          setSecurityFee(hostel.securityFee ? String(hostel.securityFee) : '');
          setOtherFines(hostel.otherFines || '');
          setRoomRating(hostel.roomRating || 0);
          setPeopleRating(hostel.peopleRating || 0);
          setGoogleMapsRating(hostel.googleMapsRating || 0);
          setOwnerRating(hostel.ownerRating || 0);
          setLockInPeriod(hostel.lockInPeriod ? String(hostel.lockInPeriod) : '');
          setNoticePeriod(hostel.noticePeriod ? String(hostel.noticePeriod) : '');
          setFoodIncluded(hostel.foodIncluded);
          setFoodCharges(hostel.foodCharges ? String(hostel.foodCharges) : '');
          setElectricityType(hostel.electricityType || 'included');
          setElectricityAmount(hostel.electricityAmount ? String(hostel.electricityAmount) : '');
          setDescription(hostel.description);
          setContactNumber(hostel.contactNumber);
          setSelectedAmenities(hostel.amenities);
          setPhotos(hostel.photos);
          setHostelLat(hostel.location.lat);
          setHostelLng(hostel.location.lng);
          setAddress(hostel.location.address);
        })
        .catch((err) => {
          console.error('Failed to load hostel:', err);
          setError('Failed to load hostel data');
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [id]);

  const handleLocationDetect = () => {
    getCurrentPosition();
  };

  /**
   * Apply EVERY new GPS fix to the pin — even if a pin already exists, and even
   * if the coordinates are identical. Keyed on the fix timestamp so a re-detect
   * always re-fires and corrects a wrong pin. Works in add AND edit mode.
   */
  useEffect(() => {
    if (gpsLat === null || gpsLng === null || gpsTimestamp === null) return;
    setHostelLat(gpsLat);
    setHostelLng(gpsLng);
    setGpsFixTime(gpsTimestamp);
    reverseGeocode(gpsLat, gpsLng).then(setAddress);
  }, [gpsLat, gpsLng, gpsTimestamp]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setHostelLat(newLat);
    setHostelLng(newLng);
    reverseGeocode(newLat, newLng).then(setAddress);
    setGpsFixTime(null);
  };

  const handleClearPin = () => {
    setHostelLat(null);
    setHostelLng(null);
    setGpsFixTime(null);
    setAddress('');
    resetGps();
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

  const movePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= photos.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setPhotoFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== index) {
      movePhoto(fromIndex, index);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const updateRent = (index: number, field: 'shares' | 'rent' | 'ac', value: number | boolean) => {
    setRents((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  // Adds a rent row for the tapped share count. Tapping the same share again
  // adds another row (e.g. to add an AC option alongside the Non-AC one).
  const addRentRow = (shares: number) => {
    setRents((prev) => [...prev, { shares, rent: 0, ac: false }]);
  };

  const removeRentRow = (index: number) => {
    setRents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a hostel name');
      return;
    }
    const validRents = rents.filter((r) => r.rent > 0);
    if (validRents.length === 0) {
      setError('Please add at least one sharing option with a valid rent amount');
      return;
    }
    if (!hostelLat || !hostelLng) {
      setError('Please select a location on the map');
      return;
    }

    setSubmitting(true);
    try {
      const baseData = {
        name: name.trim(),
        type: hostelType,
        rents: validRents,
        securityFee: securityFee ? Number(securityFee) : 0,
        otherFines: otherFines.trim(),
        roomRating,
        peopleRating,
        googleMapsRating,
        ownerRating,
        rating: roomRating, // Keep backward compat
        lockInPeriod: lockInPeriod ? Number(lockInPeriod) : 0,
        noticePeriod: noticePeriod ? Number(noticePeriod) : 0,
        foodIncluded,
        foodCharges: foodCharges ? Number(foodCharges) : 0,
        electricityType,
        electricityAmount: electricityAmount ? Number(electricityAmount) : 0,
        description: description.trim(),
        contactNumber: contactNumber.trim(),
        amenities: selectedAmenities,
        photos,
        location: {
          lat: hostelLat,
          lng: hostelLng,
          address: address || `${hostelLat.toFixed(4)}, ${hostelLng.toFixed(4)}`,
        },
      };

      if (isEditing && id) {
        await updateHostel(id, baseData);
      } else {
        await createHostel(baseData);
      }
      navigate('/');
    } catch (err) {
      setError('Failed to save hostel. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-iris-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ink-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="icon-btn"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">{isEditing ? 'Edit Hostel' : 'Add New Hostel'}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-10">
        <form onSubmit={handleSubmit} className="space-y-6 stagger-children">
          {/* Error */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-start gap-2.5">
              <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          {/* 1. Hostel Name */}
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

          {/* 2. Target Demographic */}
          <div>
            <label className="input-label">Target Demographic *</label>
            <div className="flex gap-2">
              {(['boys', 'coliving'] as HostelType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setHostelType(type)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    hostelType === type
                      ? 'bg-iris-500/15 border-iris-500/60 text-iris-300'
                      : 'bg-ink-800/60 border-white/[0.09] text-ink-300 hover:border-white/25'
                  }`}
                >
                  {type === 'boys' ? (
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Boys
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Co-living
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Contact Number */}
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

          {/* 4. Description */}
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

          {/* 5. Rent per Sharing */}
          <div>
            <label className="input-label">Rent per Sharing *</label>
            <div className="flex gap-2 mb-2">
              {SHARE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addRentRow(n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    rents.some((r) => r.shares === n)
                      ? 'bg-iris-500/15 border-iris-500/60 text-iris-300'
                      : 'bg-ink-800/60 border-white/[0.09] text-ink-300 hover:border-white/25'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-500 mb-3">
              Tap a number to add a rent option · tap again for an AC option
            </p>
            {rents.length > 0 && (
              <div className="space-y-2">
                {rents.map((rentItem, index) => (
                  <div key={index} className="flex items-center gap-2 panel !rounded-xl p-2 pop-in">
                    {/* Shares badge */}
                    <div className="flex flex-col items-center justify-center bg-ink-800/80 border border-white/[0.08] rounded-lg px-2.5 py-1.5 flex-shrink-0 min-w-[44px]">
                      <span className="text-sm font-bold text-white leading-none">{rentItem.shares}</span>
                      <span className="text-[8px] text-ink-400 uppercase tracking-wide mt-0.5">{rentItem.shares === 1 ? 'Share' : 'Shares'}</span>
                    </div>
                    {/* AC / Non-AC toggle */}
                    <button
                      type="button"
                      onClick={() => updateRent(index, 'ac', !rentItem.ac)}
                      className={`flex-shrink-0 px-2.5 py-2 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                        rentItem.ac
                          ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                          : 'bg-ink-800/60 border-white/[0.09] text-ink-400 hover:border-white/25'
                      }`}
                      title={rentItem.ac ? 'AC room — tap to switch to Non-AC' : 'Non-AC room — tap to switch to AC'}
                    >
                      {rentItem.ac ? 'AC' : 'Non-AC'}
                    </button>
                    {/* Rent input */}
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={rentItem.rent ? formatIndianNumber(String(rentItem.rent)) : ''}
                        onChange={(e) => {
                          updateRent(index, 'rent', Number(stripNonDigits(e.target.value)));
                        }}
                        placeholder="Rent"
                        className="w-full bg-ink-800/60 border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-white text-sm placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-iris-500/50 focus:border-iris-500/60 transition-all"
                      />
                    </div>
                    {/* Remove row */}
                    <button
                      type="button"
                      onClick={() => removeRentRow(index)}
                      className="flex-shrink-0 p-2 text-ink-500 hover:text-rose-400 transition-colors"
                      aria-label="Remove this rent option"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Security Fee */}
          <div>
            <label className="input-label" htmlFor="securityFee">Security Fee (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
              <input
                id="securityFee"
                type="text"
                inputMode="numeric"
                value={securityFee ? formatIndianNumber(securityFee) : ''}
                onChange={(e) => {
                  setSecurityFee(stripNonDigits(e.target.value));
                }}
                placeholder="5,000"
                className="input-field pl-8"
              />
            </div>
          </div>

          {/* 7. Food & Electricity */}
          <div className="panel p-4">
            <h2 className="section-title mb-3">Food & Electricity</h2>

            {/* Food */}
            <div className="mb-4">
              <label className="text-[11px] font-medium text-ink-400 mb-1.5 block">Food</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFoodIncluded(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    foodIncluded
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                      : 'bg-ink-800/60 border-white/[0.09] text-ink-300 hover:border-white/25'
                  }`}
                >
                  Included
                </button>
                <button
                  type="button"
                  onClick={() => setFoodIncluded(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    !foodIncluded
                      ? 'bg-rose-500/15 border-rose-500/60 text-rose-300'
                      : 'bg-ink-800/60 border-white/[0.09] text-ink-300 hover:border-white/25'
                  }`}
                >
                  Not Included
                </button>
              </div>
              {!foodIncluded && (
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={foodCharges ? formatIndianNumber(foodCharges) : ''}
                    onChange={(e) => {
                      setFoodCharges(stripNonDigits(e.target.value));
                    }}
                    placeholder="Food charges per month"
                    className="w-full bg-ink-800/60 border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-white text-sm placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-iris-500/50 focus:border-iris-500/60 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Electricity */}
            <div>
              <label className="text-[11px] font-medium text-ink-400 mb-1.5 block">Electricity</label>
              <div className="flex gap-2">
                {(['included', 'fixed', 'per_unit'] as ElectricityType[]).map((eType) => (
                  <button
                    key={eType}
                    type="button"
                    onClick={() => setElectricityType(eType)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      electricityType === eType
                        ? 'bg-iris-500/15 border-iris-500/60 text-iris-300'
                        : 'bg-ink-800/60 border-white/[0.09] text-ink-300 hover:border-white/25'
                    }`}
                  >
                    {eType === 'included' ? 'Included' : eType === 'fixed' ? 'Fixed Bill' : 'Per Unit'}
                  </button>
                ))}
              </div>
              {electricityType !== 'included' && (
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={electricityAmount ? formatIndianNumber(electricityAmount) : ''}
                    onChange={(e) => {
                      setElectricityAmount(stripNonDigits(e.target.value));
                    }}
                    placeholder={electricityType === 'fixed' ? 'Fixed amount per month' : 'Rate per unit (₹)'}
                    className="w-full bg-ink-800/60 border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-white text-sm placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-iris-500/50 focus:border-iris-500/60 transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 8. Policy & Agreements */}
          <div className="panel p-4">
            <h2 className="section-title mb-3">Policy & Agreements</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label" htmlFor="lockInPeriod">Lock-in Period</label>
                <div className="relative">
                  <select
                    id="lockInPeriod"
                    value={lockInPeriod}
                    onChange={(e) => setLockInPeriod(e.target.value)}
                    className="w-full bg-ink-800/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-iris-500/50 focus:border-iris-500/60 transition-all appearance-none"
                  >
                    <option value="">None</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div>
                <label className="input-label" htmlFor="noticePeriod">Notice Period</label>
                <div className="relative">
                  <select
                    id="noticePeriod"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full bg-ink-800/60 border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-iris-500/50 focus:border-iris-500/60 transition-all appearance-none"
                  >
                    <option value="">None</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 9. Other Fines & Rules */}
          <div>
            <label className="input-label" htmlFor="otherFines">Other Fines & Rules</label>
            <textarea
              id="otherFines"
              value={otherFines}
              onChange={(e) => setOtherFines(e.target.value)}
              placeholder="e.g. Late fee: ₹100/day, No visitors after 10pm..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* 10. Other */}
          <div>
            <label className="input-label">Other</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_LIST.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    selectedAmenities.includes(amenity)
                      ? 'bg-iris-500/15 border-iris-500/60 text-iris-300'
                      : 'bg-ink-800/60 border-white/[0.09] text-ink-300 hover:border-white/25'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* 11-14. Ratings */}
          <div className="panel p-4">
            <h2 className="section-title mb-4">Ratings</h2>

            {/* Room Rating */}
            <div className="mb-4">
              <label className="text-[11px] font-medium text-ink-400 mb-1.5 block">Room Rating</label>
              <StarRating value={roomRating} onChange={setRoomRating} maxStars={5} />
            </div>

            {/* People/Vibe Rating */}
            <div className="mb-4">
              <label className="text-[11px] font-medium text-ink-400 mb-1.5 block">People/Vibe Rating</label>
              <StarRating value={peopleRating} onChange={setPeopleRating} maxStars={5} />
            </div>

            {/* Owner Rating (out of 3) */}
            <div className="mb-4">
              <label className="text-[11px] font-medium text-ink-400 mb-1.5 block">Owner Rating (out of 3)</label>
              <StarRating value={ownerRating} onChange={setOwnerRating} maxStars={3} />
            </div>

            {/* Google Maps Review */}
            <div>
              <label className="text-[11px] font-medium text-ink-400 mb-1.5 block">Google Maps Review</label>
              <StarRating value={googleMapsRating} onChange={setGoogleMapsRating} maxStars={5} />
            </div>
          </div>

          {/* 15. Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Location *</label>
              <div className="flex items-center gap-2">
                {hostelLat !== null && hostelLng !== null && (
                  <button
                    type="button"
                    onClick={handleClearPin}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25 rounded-xl hover:bg-rose-500/20 transition-colors active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Pin
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLocationDetect}
                  disabled={gpsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-iris-500/10 text-iris-300 border border-iris-500/30 rounded-xl hover:bg-iris-500/20 transition-colors active:scale-95 disabled:opacity-50"
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
            </div>

            {gpsError && (
              <p className="text-xs text-rose-400 mb-2">{gpsError}</p>
            )}

            <div className="h-64 rounded-2xl overflow-hidden border border-white/[0.08] mb-2 shadow-lg shadow-black/30">
              <MapContainer
                center={[hostelLat || 20.5937, hostelLng || 78.9629]}
                zoom={5}
                className="h-full w-full"
                zoomControl={true}
                maxZoom={18}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                {hostelLat !== null && hostelLng !== null && (
                  <>
                    <Marker
                      position={[hostelLat, hostelLng]}
                      icon={markerIcon}
                      eventHandlers={{ click: handleClearPin }}
                    />
                    {/* Invisible tap target over the pin for reliable tap-to-remove */}
                    <CircleMarker
                      center={[hostelLat, hostelLng]}
                      radius={14}
                      pathOptions={{ opacity: 0, fillOpacity: 0 }}
                      eventHandlers={{ click: handleClearPin }}
                    />
                    <MapCenterUpdater lat={hostelLat} lng={hostelLng} gpsFixTime={gpsFixTime} />
                  </>
                )}
                <LocationPicker onLocationChange={handleMapClick} />
              </MapContainer>
            </div>
            <p className="text-[11px] text-ink-500">Tap the map to set the pin · tap the pin (or Clear Pin) to remove it</p>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address..."
              className="input-field mt-2"
            />
          </div>

          {/* 16. Photos (last) */}
          <div>
            <label className="input-label">Photos</label>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    className={`relative aspect-square rounded-xl overflow-hidden bg-ink-800 group transition-all duration-200 ${
                      dragOverIndex === index ? 'ring-2 ring-iris-500 scale-95 opacity-60' : ''
                    } ${dragIndexRef.current === index ? 'opacity-40' : ''}`}
                  >
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    {/* Drag handle */}
                    <div className="absolute top-1 left-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 15h18v-2H3v2zm0-4h18V9H3v2zm0-6v2h18V5H3zm0 12h18v-2H3v2z" />
                      </svg>
                    </div>
                    {/* Photo number badge */}
                    <div className="absolute bottom-1 left-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                      {index + 1}
                    </div>
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-rose-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {/* Move left/right buttons - always visible for mobile */}
                    {photos.length > 1 && (
                      <div className="absolute bottom-1 right-1 flex gap-0.5">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); movePhoto(index, index - 1); }}
                            className="w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70"
                          >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        {index < photos.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); movePhoto(index, index + 1); }}
                            className="w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70"
                          >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
            }
            {photos.length > 1 && (
              <p className="text-[11px] text-ink-500 mb-2">
                Drag or use arrows to reorder. First photo is used as the card thumbnail.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-white/[0.12] hover:border-iris-500/50 text-ink-400 hover:text-iris-300 transition-all duration-200 bg-ink-850/60"
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
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-white/[0.12] hover:border-iris-500/50 text-ink-400 hover:text-iris-300 transition-all duration-200 bg-ink-850/60"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Gallery</span>
              </button>
            </div>
            <p className="text-[11px] text-ink-500 mt-1.5">
              Camera takes one photo at a time (tap multiple times). Gallery lets you select multiple.
            </p>
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
                {isEditing ? 'Update Hostel' : 'Save Hostel'}
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
