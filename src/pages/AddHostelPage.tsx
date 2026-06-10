import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import { useGeolocation } from '../hooks/useGeolocation';
import { createHostel, updateHostel, getHostelById, fileToBase64 } from '../storage';
import { AMENITIES_LIST } from '../types';
import type { HostelRent, HostelType, ElectricityType } from '../types';

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

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-all duration-150 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <svg
            className={`w-6 h-6 ${star <= value ? 'text-yellow-400' : 'text-slate-600'}`}
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

const DEFAULT_SHARES: HostelRent[] = [
  { shares: 3, rent: 0 },
];

export default function AddHostelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { lat, lng, loading: gpsLoading, error: gpsError, getCurrentPosition } = useGeolocation();

  const isEditing = !!id;

  const [name, setName] = useState('');
  const [hostelType, setHostelType] = useState<HostelType>('boys');
  const [rents, setRents] = useState<HostelRent[]>(DEFAULT_SHARES);
  const [securityFee, setSecurityFee] = useState('');
  const [otherFines, setOtherFines] = useState('');
  const [rating, setRating] = useState(0);
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

  // Location state
  const [hostelLat, setHostelLat] = useState<number | null>(null);
  const [hostelLng, setHostelLng] = useState<number | null>(null);
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
          setRating(hostel.rating || 0);
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

  // When GPS updates, set hostel location
  useEffect(() => {
    if (lat && lng && hostelLat === null && hostelLng === null && !isEditing) {
      setHostelLat(lat);
      setHostelLng(lng);
      reverseGeocode(lat, lng).then(setAddress);
    }
  }, [lat, lng, hostelLat, hostelLng, isEditing]);

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

  const updateRent = (index: number, field: 'shares' | 'rent', value: number) => {
    setRents((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRentRow = () => {
    const maxShares = Math.max(...rents.map((r) => r.shares), 0);
    setRents((prev) => [...prev, { shares: maxShares + 1, rent: 0 }]);
  };

  const removeRentRow = (index: number) => {
    if (rents.length <= 1) return;
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
      setError('Please enter at least one valid rent amount');
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
        rating,
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-bold">{isEditing ? 'Edit Hostel' : 'Add New Hostel'}</h1>
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

          {/* Target Demographic */}
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
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
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

          {/* Rent per share */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Rent per Sharing *</label>
              <button
                type="button"
                onClick={addRentRow}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Share
              </button>
            </div>
            <div className="space-y-2">
              {rents.map((rentItem, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={rentItem.shares}
                        onChange={(e) => updateRent(index, 'shares', Math.max(1, Number(e.target.value)))}
                        min="1"
                        className="w-16 bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                      />
                      <span className="text-slate-400 text-sm font-medium">
                        {rentItem.shares === 1 ? 'Share' : 'Shares'}
                      </span>
                    </div>
                  </div>
                  <div className="relative flex-[2]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input
                      type="number"
                      value={rentItem.rent || ''}
                      onChange={(e) => updateRent(index, 'rent', Number(e.target.value))}
                      placeholder="Rent"
                      min="0"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                  {rents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRentRow(index)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Security Fee & Rating row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label" htmlFor="securityFee">Security Fee (₹)</label>
              <input
                id="securityFee"
                type="number"
                value={securityFee}
                onChange={(e) => setSecurityFee(e.target.value)}
                placeholder="5000"
                min="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Rating</label>
              <div className="input-field flex items-center pt-2.5 pb-2">
                <StarRating value={rating} onChange={setRating} />
              </div>
            </div>
          </div>

          {/* Food & Electricity (common for all sharing types) */}
          <div className="card p-4 border border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Food & Electricity</h2>

            {/* Food */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Food</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFoodIncluded(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    foodIncluded
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Included
                </button>
                <button
                  type="button"
                  onClick={() => setFoodIncluded(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    !foodIncluded
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Not Included
                </button>
              </div>
              {!foodIncluded && (
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={foodCharges}
                    onChange={(e) => setFoodCharges(e.target.value)}
                    placeholder="Food charges per month"
                    min="0"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Electricity */}
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Electricity</label>
              <div className="flex gap-2">
                {(['included', 'fixed', 'per_unit'] as ElectricityType[]).map((eType) => (
                  <button
                    key={eType}
                    type="button"
                    onClick={() => setElectricityType(eType)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      electricityType === eType
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {eType === 'included' ? 'Included' : eType === 'fixed' ? 'Fixed Bill' : 'Per Unit'}
                  </button>
                ))}
              </div>
              {electricityType !== 'included' && (
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={electricityAmount}
                    onChange={(e) => setElectricityAmount(e.target.value)}
                    placeholder={electricityType === 'fixed' ? 'Fixed amount per month' : 'Rate per unit (₹)'}
                    min="0"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Policy & Agreements */}
          <div className="card p-4 border border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Policy & Agreements</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label" htmlFor="lockInPeriod">Lock-in Period</label>
                <div className="relative">
                  <select
                    id="lockInPeriod"
                    value={lockInPeriod}
                    onChange={(e) => setLockInPeriod(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="">None</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="">None</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Other Fines */}
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
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
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


