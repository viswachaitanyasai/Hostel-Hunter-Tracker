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
  const hasAc = hostel.rents.some((r) => r.ac);

  return (
    <div
      onClick={() => !disableNavigation && navigate(`/hostel/${hostel.id}`)}
      className={`card group transition-all duration-300 hover:-translate-y-1 hover:border-iris-500/30 active:scale-[0.98] ${
        disableNavigation ? '' : 'cursor-pointer'
      }`}
      style={{ boxShadow: '0 8px 24px -12px rgb(0 0 0 / 0.7)' }}
    >
      {/* Photo */}
      <div className="aspect-[4/3] bg-ink-800 relative overflow-hidden">
        {hasPhoto ? (
          <img
            src={hostel.photos[0]}
            alt={hostel.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
        )}
        {/* Photo gradient scrim for badge legibility */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

        {/* Rent badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full pl-2 pr-2.5 py-1 bg-ink-950/60 backdrop-blur-md border border-white/10">
          <svg className="w-3 h-3 text-iris-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.71-.35-3.09-1.51-3.2-3.4h2.05c.1 1.05.82 1.87 2.56 1.87 1.55 0 2.29-.75 2.29-1.71 0-.93-.49-1.56-2.6-2.08-2.4-.58-4.04-1.5-4.04-3.49 0-1.69 1.34-2.85 3.15-3.24V4h2.82v2.04c1.66.4 2.75 1.55 2.81 3.35h-2.04c-.06-1.1-.75-1.87-2.26-1.87-1.42 0-2.19.65-2.19 1.59 0 .99.72 1.5 2.68 1.98 2.52.61 3.99 1.63 3.99 3.56-.01 1.86-1.39 2.94-3.4 3.44z" />
          </svg>
          <span className="text-[11px] font-bold text-white leading-none">
            ₹{cheapestRent.toLocaleString()}
          </span>
        </div>
        {/* Rating badge - show room rating */}
        {hostel.roomRating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 bg-ink-950/60 backdrop-blur-md border border-white/10">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-[11px] font-bold text-amber-300 leading-none">{hostel.roomRating}</span>
          </div>
        )}
        {/* Photo count */}
        {hostel.photos.length > 1 && (
          <div className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-950/60 text-ink-200 backdrop-blur-md border border-white/10">
            +{hostel.photos.length - 1}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-semibold text-white text-[13px] leading-tight truncate">{hostel.name}</h3>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex-shrink-0 ${
            hostel.type === 'boys'
              ? 'bg-sky-500/15 text-sky-300 border border-sky-400/25'
              : 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-400/25'
          }`}>
            {hostel.type === 'boys' ? 'Boys' : 'Co-living'}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-400">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{hostel.location.address || `${hostel.location.lat.toFixed(4)}, ${hostel.location.lng.toFixed(4)}`}</span>
        </div>
        {/* Rent options summary */}
        {hostel.rents.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-ink-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">
              {hostel.rents.map((r) => `${r.shares}·sh${r.ac ? ' ·AC' : ''} @ ₹${r.rent.toLocaleString()}`).join(', ')}
            </span>
          </div>
        )}
        {/* Feature tags */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          {hasAc && (
            <span className="pill pill-ac">AC</span>
          )}
          {hostel.amenities.slice(0, hasAc ? 3 : 4).map((amenity) => (
            <span key={amenity} className="text-[10px] px-2 py-0.5 rounded-full bg-ink-800/80 text-ink-300 border border-white/[0.07]">
              {amenity}
            </span>
          ))}
          {hostel.amenities.length > (hasAc ? 3 : 4) && (
            <span className="text-[10px] font-semibold text-ink-500">+{hostel.amenities.length - (hasAc ? 3 : 4)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
