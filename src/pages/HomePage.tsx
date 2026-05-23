import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HostelCard from '../components/HostelCard';
import { listHostels } from '../storage';
import { AMENITIES_LIST } from '../types';
import type { Hostel } from '../types';

interface Filters {
  searchQuery: string;
  minRent: string;
  maxRent: string;
  selectedAmenities: string[];
  minRating: number;
  maxShares: string;
}

const defaultFilters: Filters = {
  searchQuery: '',
  minRent: '',
  maxRent: '',
  selectedAmenities: [],
  minRating: 0,
  maxShares: '',
};

export default function HomePage() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

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

  const toggleAmenityFilter = (amenity: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedAmenities: prev.selectedAmenities.includes(amenity)
        ? prev.selectedAmenities.filter((a) => a !== amenity)
        : [...prev.selectedAmenities, amenity],
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const hasActiveFilters = filters.minRent || filters.maxRent || filters.selectedAmenities.length > 0 || filters.minRating > 0 || filters.maxShares;

  const filteredHostels = hostels.filter((h) => {
    const q = filters.searchQuery.toLowerCase();

    // Search
    if (filters.searchQuery) {
      const matchesSearch =
        h.name.toLowerCase().includes(q) ||
        h.location.address.toLowerCase().includes(q) ||
        h.amenities.some((a) => a.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    // Rent range (check against cheapest rent)
    const cheapest = h.rents.length > 0 ? Math.min(...h.rents.map((r) => r.rent)) : 0;
    if (filters.minRent && cheapest < Number(filters.minRent)) return false;
    if (filters.maxRent && cheapest > Number(filters.maxRent)) return false;

    // Amenities
    if (filters.selectedAmenities.length > 0) {
      const hasAll = filters.selectedAmenities.every((a) => h.amenities.includes(a));
      if (!hasAll) return false;
    }

    // Rating
    if (filters.minRating > 0 && h.rating < filters.minRating) return false;

    // Max shares (hostel must have an option with this many or fewer shares)
    if (filters.maxShares) {
      const hasSuitableShare = h.rents.some((r) => r.shares <= Number(filters.maxShares));
      if (!hasSuitableShare) return false;
    }

    return true;
  });

  const activeFilterCount = [
    filters.minRent || filters.maxRent,
    filters.selectedAmenities.length > 0,
    filters.minRating > 0,
    filters.maxShares,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Hostel Finder</h1>
              <p className="text-sm text-slate-400 mt-0.5">Find your perfect stay</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl transition-colors border ${
                  hasActiveFilters
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                }`}
                aria-label="Toggle filters"
              >
                <div className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {hasActiveFilters && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => navigate('/map')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
                aria-label="View map"
              >
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search hostels..."
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="sticky top-[132px] z-30 bg-slate-800/95 backdrop-blur-lg border-b border-slate-700/50 shadow-xl">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Clear all filters
              </button>
            )}

            {/* Rent Range */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                Rent Range (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minRent}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minRent: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxRent}
                  onChange={(e) => setFilters((prev) => ({ ...prev, maxRent: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Room Sharing */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                Max Room Sharing
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilters((prev) => ({ ...prev, maxShares: prev.maxShares === String(n) ? '' : String(n) }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      filters.maxShares === String(n)
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {n}-Share
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                Minimum Rating
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilters((prev) => ({ ...prev, minRating: prev.minRating === n ? 0 : n }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      filters.minRating === n
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                        : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {n === 0 ? 'Any' : `${n}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES_LIST.map((amenity) => (
                  <button
                    key={amenity}
                    onClick={() => toggleAmenityFilter(amenity)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      filters.selectedAmenities.includes(amenity)
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-[4/3] bg-slate-700" />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredHostels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-1">
              {filters.searchQuery || hasActiveFilters ? 'No hostels match your filters' : 'No hostels yet'}
            </h3>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              {filters.searchQuery || hasActiveFilters
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first hostel to get started'}
            </p>
            {!filters.searchQuery && !hasActiveFilters && (
              <button onClick={() => navigate('/add')} className="btn-primary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Hostel
              </button>
            )}
            {(filters.searchQuery || hasActiveFilters) && (
              <button onClick={clearFilters} className="btn-secondary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Result count */}
            <p className="text-xs text-slate-500 mb-3">
              {filteredHostels.length} {filteredHostels.length === 1 ? 'hostel' : 'hostels'} found
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filteredHostels.map((hostel) => (
                <HostelCard key={hostel.id} hostel={hostel} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick add button when hostels exist */}
      {!loading && filteredHostels.length > 0 && (
        <button
          onClick={() => navigate('/add')}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105"
          aria-label="Add hostel"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}
