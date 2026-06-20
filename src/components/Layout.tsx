import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/track', label: 'Track', icon: TrackIcon },
  { to: '/map', label: 'Map', icon: MapIcon },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-blue-400 scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}
