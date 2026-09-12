import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HostelCard from '../components/HostelCard';
import { listHostels, exportHostels, triggerDownload, parseImportFile, importHostels } from '../storage';
import { AMENITIES_LIST, SHARE_OPTIONS } from '../types';
import type { Hostel } from '../types';

type AcFilter = '' | 'ac' | 'nonac';

interface Filters {
  searchQuery: string;
  minRent: string;
  maxRent: string;
  selectedAmenities: string[];
  minRating: number;
  selectedShares: number[];
  acFilter: AcFilter;
}

const defaultFilters: Filters = {
  searchQuery: '',
  minRent: '',
  maxRent: '',
  selectedAmenities: [],
  minRating: 0,
  selectedShares: [],
  acFilter: '',
};

export default function HomePage() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleShareFilter = (n: number) => {
    setFilters((prev) => ({
      ...prev,
      selectedShares: prev.selectedShares.includes(n)
        ? prev.selectedShares.filter((s) => s !== n)
        : [...prev.selectedShares, n],
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const hasActiveFilters = filters.minRent || filters.maxRent || filters.selectedAmenities.length > 0 || filters.minRating > 0 || filters.selectedShares.length > 0 || filters.acFilter;

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

    // Other features
    if (filters.selectedAmenities.length > 0) {
      const hasAll = filters.selectedAmenities.every((a) => h.amenities.includes(a));
      if (!hasAll) return false;
    }

    // Rating - use roomRating as the primary filter
    if (filters.minRating > 0 && h.roomRating < filters.minRating) return false;

    // Room sharing (hostel must offer at least one of the selected share counts)
    if (filters.selectedShares.length > 0) {
      const hasMatchingShare = h.rents.some((r) => filters.selectedShares.includes(r.shares));
      if (!hasMatchingShare) return false;
    }

    // AC / Non-AC (hostel must have at least one matching rent option)
    if (filters.acFilter === 'ac' && !h.rents.some((r) => r.ac)) return false;
    if (filters.acFilter === 'nonac' && !h.rents.some((r) => !r.ac)) return false;

    return true;
  });

  const activeFilterCount = [
    filters.minRent || filters.maxRent,
    filters.selectedAmenities.length > 0,
    filters.minRating > 0,
    filters.selectedShares.length > 0,
    filters.acFilter,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ink-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              {/* Logo mark */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-iris-500 to-iris-600 flex items-center justify-center shadow-lg shadow-iris-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                  Hostel<span className="text-iris-400">Finder</span>
                </h1>
                <p className="text-[11px] text-ink-400 mt-1">Find your perfect stay</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`icon-btn relative ${hasActiveFilters || showFilters ? '!border-iris-500/50 !text-iris-300 !bg-iris-500/10' : ''}`}
                aria-label="Toggle filters"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {hasActiveFilters && (
                  <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] h-[18px] bg-iris-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-iris-500/50">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/map')}
                className="icon-btn"
                aria-label="View map"
              >
                <svg className="w-[18px] h-[18px] text-iris-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              {/* Export / Import menu */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="icon-btn"
                  aria-label="Export or import data"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-ink-850 border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 py-1.5 min-w-[190px] overflow-hidden">
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          setSelectionMode(true);
                          setSelectedIds(new Set());
                        }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-ink-200 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-2.5"
                        disabled={hostels.length === 0}
                      >
                        <svg className="w-4 h-4 text-iris-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Export Selected
                      </button>
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          const blob = exportHostels(hostels);
                          const date = new Date().toISOString().split('T')[0];
                          triggerDownload(blob, `hostels_all_${date}.json`);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-ink-200 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-2.5"
                        disabled={hostels.length === 0}
                      >
                        <svg className="w-4 h-4 text-iris-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export All ({hostels.length})
                      </button>
                      <div className="border-t border-white/[0.06] my-1" />
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          importInputRef.current?.click();
                        }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-ink-200 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-2.5"
                      >
                        <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L5 8m4-4v12" />
                        </svg>
                        Import
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {filters.searchQuery && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <input
              type="text"
              placeholder="Search hostels, areas, features…"
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-ink-850/80 border border-white/[0.08] rounded-2xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-iris-500/50 focus:border-iris-500/50 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="sticky top-[136px] z-30 px-4 max-w-lg mx-auto pt-3">
          <div className="panel backdrop-blur-xl p-4 space-y-5 max-h-[52vh] overflow-y-auto stagger-children">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Filters</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-iris-300 hover:text-iris-200 font-medium transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Rent Range */}
            <div>
              <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-[0.12em] mb-2 block">
                Rent Range (₹/mo)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minRent}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minRent: e.target.value }))}
                  className="input-field !py-2 text-sm"
                />
                <span className="text-ink-600">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxRent}
                  onChange={(e) => setFilters((prev) => ({ ...prev, maxRent: e.target.value }))}
                  className="input-field !py-2 text-sm"
                />
              </div>
            </div>

            {/* Room Sharing */}
            <div>
              <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-[0.12em] mb-2 block">
                Room Sharing
              </label>
              <div className="flex flex-wrap gap-2">
                {SHARE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => toggleShareFilter(n)}
                    className={`chip flex-1 min-w-[60px] !rounded-xl py-2 !text-[13px] ${
                      filters.selectedShares.includes(n) ? 'chip-selected' : ''
                    }`}
                  >
                    {n}-Share
                  </button>
                ))}
              </div>
              {filters.selectedShares.length > 0 && (
                <p className="text-[10px] text-ink-500 mt-1.5">
                  Offering {filters.selectedShares.slice().sort((a, b) => a - b).join(', ')} sharing
                </p>
              )}
            </div>

            {/* Room Rating filter */}
            <div>
              <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-[0.12em] mb-2 block">
                Min Room Rating
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilters((prev) => ({ ...prev, minRating: prev.minRating === n ? 0 : n }))}
                    className={`chip flex-1 !rounded-xl py-2 !text-[13px] ${
                      filters.minRating === n
                        ? '!bg-amber-500/15 !border-amber-500/60 !text-amber-300 shadow-[0_0_0_1px_rgb(245_158_11/0.2)]'
                        : ''
                    }`}
                  >
                    {n === 0 ? 'Any' : `${n}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* AC / Non-AC Room Type */}
            <div>
              <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-[0.12em] mb-2 block">
                Room Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, acFilter: '' }))}
                  className={`chip flex-1 !rounded-xl py-2 !text-[13px] ${filters.acFilter === '' ? 'chip-selected' : ''}`}
                >
                  Any
                </button>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, acFilter: prev.acFilter === 'ac' ? '' : 'ac' }))}
                  className={`chip flex-1 !rounded-xl py-2 !text-[13px] gap-1.5 ${
                    filters.acFilter === 'ac'
                      ? '!bg-cyan-500/15 !border-cyan-400/60 !text-cyan-300 shadow-[0_0_0_1px_rgb(34_211_238/0.2)]'
                      : ''
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  AC
                </button>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, acFilter: prev.acFilter === 'nonac' ? '' : 'nonac' }))}
                  className={`chip flex-1 !rounded-xl py-2 !text-[13px] ${
                    filters.acFilter === 'nonac'
                      ? '!bg-ink-600/60 !border-ink-400/60 !text-ink-100'
                      : ''
                  }`}
                >
                  Non-AC
                </button>
              </div>
            </div>

            {/* Other */}
            <div>
              <label className="text-[11px] font-semibold text-ink-300 uppercase tracking-[0.12em] mb-2 block">
                Other
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES_LIST.map((amenity) => (
                  <button
                    key={amenity}
                    onClick={() => toggleAmenityFilter(amenity)}
                    className={`chip ${filters.selectedAmenities.includes(amenity) ? 'chip-selected' : ''}`}
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
          <div className="grid grid-cols-2 gap-3 stagger-children">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-[4/3] bg-ink-800" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3.5 bg-ink-800 rounded-lg w-3/4" />
                  <div className="h-3 bg-ink-800 rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredHostels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-ink-900 border border-white/[0.06] flex items-center justify-center mb-5 rotate-3">
              <svg className="w-9 h-9 text-ink-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">
              {filters.searchQuery || hasActiveFilters ? 'No matches found' : 'No hostels yet'}
            </h3>
            <p className="text-sm text-ink-400 mb-6 max-w-[240px] leading-relaxed">
              {filters.searchQuery || hasActiveFilters
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first hostel to get started'}
            </p>
            {!filters.searchQuery && !hasActiveFilters ? (
              <button onClick={() => navigate('/add')} className="btn-primary flex items-center gap-2">
                <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                Add Hostel
              </button>
            ) : (
              <button onClick={clearFilters} className="btn-secondary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Result count */}
            <p className="text-[11px] font-medium text-ink-400 uppercase tracking-[0.12em] mb-3">
              {filteredHostels.length} {filteredHostels.length === 1 ? 'hostel' : 'hostels'}
            </p>
            {selectionMode && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-ink-300 font-medium">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = exportHostels(filteredHostels.filter(h => selectedIds.has(h.id)));
                      const date = new Date().toISOString().split('T')[0];
                      triggerDownload(blob, `hostels_selected_${date}.json`);
                      setSelectionMode(false);
                      setSelectedIds(new Set());
                    }}
                    disabled={selectedIds.size === 0}
                    className="text-xs px-3.5 py-2 bg-gradient-to-b from-iris-500 to-iris-600 text-white rounded-xl font-semibold hover:from-iris-400 hover:to-iris-500 transition-all disabled:opacity-50 shadow-lg shadow-iris-500/25"
                  >
                    Export ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedIds(new Set());
                    }}
                    className="text-xs px-3.5 py-2 bg-ink-700/60 text-ink-200 rounded-xl font-semibold hover:bg-ink-700 transition-colors border border-white/[0.08]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 stagger-children">
              {filteredHostels.map((hostel) => (
                selectionMode ? (
                  <div key={hostel.id} className="relative">
                    <div
                      onClick={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(hostel.id)) next.delete(hostel.id);
                          else next.add(hostel.id);
                          return next;
                        });
                      }}
                      className="relative"
                    >
                      <HostelCard hostel={hostel} disableNavigation />
                    </div>
                    {/* Selection checkbox */}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                      selectedIds.has(hostel.id)
                        ? 'bg-iris-500 border-iris-400 shadow-lg shadow-iris-500/50'
                        : 'bg-black/40 border-white/60 backdrop-blur-sm'
                    }`}>
                      {selectedIds.has(hostel.id) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ) : (
                  <HostelCard key={hostel.id} hostel={hostel} />
                )
              ))}
            </div>
          </>
        )}
      </div>

      {/* Import status toast */}
      {importStatus && (
        <div className="fixed top-4 left-4 right-4 z-[60] max-w-lg mx-auto toast-in">
          <div className={`px-4 py-3 rounded-2xl border shadow-2xl text-sm font-medium backdrop-blur-xl ${
            importStatus.startsWith('Error')
              ? 'bg-rose-950/80 border-rose-500/30 text-rose-300'
              : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={importStatus.startsWith('Error') ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
              </svg>
              {importStatus}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setImporting(true);
          setImportStatus('Importing...');
          try {
            const text = await file.text();
            const { hostels: parsedHostels } = parseImportFile(text);
            const count = await importHostels(parsedHostels);
            setImportStatus(`Successfully imported ${count} ${count === 1 ? 'hostel' : 'hostels'}!`);
            // Reload hostels
            const data = await listHostels();
            setHostels(data);
          } catch (err: any) {
            setImportStatus(`Error: ${err.message || 'Failed to import'}`);
          } finally {
            setImporting(false);
            e.target.value = '';
            setTimeout(() => setImportStatus(''), 4000);
          }
        }}
      />

      {/* Quick add button when hostels exist */}
      {!loading && filteredHostels.length > 0 && (
        <button
          onClick={() => navigate('/add')}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-2xl bg-gradient-to-b from-iris-500 to-iris-600 text-white shadow-2xl shadow-iris-500/40 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 hover:from-iris-400 hover:to-iris-500"
          aria-label="Add hostel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}
