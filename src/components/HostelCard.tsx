import { useNavigate } from 'react-router-dom';
import type { Hostel } from '../types';

interface HostelCardProps {
  hostel: Hostel;
  disableNavigation?: boolean;
}

export default function HostelCard({ hostel, disableNavigation }: HostelCardProps) {
  const navigate = useNavigate();
  const hasPhoto = hostel.photos.length > 0;
  const cheapestRent = hostel.rents.length > 0 ? Math.min(...hostel.rents.map((r) => r.rent)) : 0;

  return (
    <div
      onClick={() => !disableNavigation && navigate(`/hostel/${hostel.id}`)}
      className={`card transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-0.5 active:scale-[0.98] ${
        disableNavigation ? '' : 'cursor-pointer hover:border-slate-600'
      }`}
    >
      {/* Photo */}
      <div className="aspect-[4/3] bg-slate-700 relative overflow-hidden">
        {hasPhoto ? (
          <img
            src={hostel.photos[0]}
            alt={hostel.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Rent badge */}
        <div className="absolute top-2 right-2 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
          ₹{cheapestRent.toLocaleString()}/mo
        </div>
        {/* Rating badge - show room rating */}
        {hostel.roomRating > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {hostel.roomRating}
          </div>
        )}
        {/* Photo count */}
        {hostel.photos.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            +{hostel.photos.length - 1}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-semibold text-white text-sm truncate">{hostel.name}</h3>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            hostel.type === 'boys'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
          }`}>
            {hostel.type === 'boys' ? 'Boys' : 'Co-living'}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{hostel.location.address || `${hostel.location.lat.toFixed(4)}, ${hostel.location.lng.toFixed(4)}`}</span>
        </div>
        {/* Rent options summary */}
        {hostel.rents.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{hostel.rents.map((r) => `${r.shares} sharing${r.ac ? ' (AC)' : ''} @ ₹${r.rent}`).join(', ')}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {hostel.amenities.slice(0, 4).map((amenity) => (
            <span key={amenity} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
              {amenity}
            </span>
          ))}
          {hostel.amenities.length > 4 && (
            <span className="text-[10px] text-slate-400">+{hostel.amenities.length - 4}</span>
          )}
        </div>
      </div>
    </div>
  );
}
