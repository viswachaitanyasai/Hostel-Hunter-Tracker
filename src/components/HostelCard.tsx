import { useNavigate } from 'react-router-dom';
import type { Hostel } from '../types';

interface HostelCardProps {
  hostel: Hostel;
}

export default function HostelCard({ hostel }: HostelCardProps) {
  const navigate = useNavigate();
  const hasPhoto = hostel.photos.length > 0;

  return (
    <div
      onClick={() => navigate(`/hostel/${hostel.id}`)}
      className="card cursor-pointer hover:border-slate-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-0.5 active:scale-[0.98]"
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
          ₹{hostel.rent.toLocaleString()}/mo
        </div>
        {/* AC badge */}
        {hostel.hasAC && (
          <div className="absolute top-2 left-2 bg-cyan-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            AC
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
        <h3 className="font-semibold text-white text-sm truncate">{hostel.name}</h3>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{hostel.location.address || `${hostel.location.lat.toFixed(4)}, ${hostel.location.lng.toFixed(4)}`}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {hostel.amenities.slice(0, 3).map((amenity) => (
            <span key={amenity} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
              {amenity}
            </span>
          ))}
          {hostel.amenities.length > 3 && (
            <span className="text-[10px] text-slate-400">+{hostel.amenities.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
}
