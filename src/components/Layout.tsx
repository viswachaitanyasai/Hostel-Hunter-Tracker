import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/map', label: 'Map', icon: MapIcon },
];

export default function Layout() {
  const location = useLocation();
  return (
    <div className="min-h-screen lg:pl-60">
      {/* Keyed content: page-enter rises the page body on navigation.
          The nav stays outside so it never animates or breaks fixed positioning. */}
      <main key={location.pathname} className="page-enter pb-28 lg:pb-10">
        <Outlet />
      </main>

      {/* Desktop sidebar (lg and up) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col z-50 border-r border-white/[0.06] bg-ink-900/70 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-iris-500 to-iris-600 flex items-center justify-center shadow-lg shadow-iris-500/30 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              Hostel<span className="text-iris-400">Finder</span>
            </h1>
            <p className="text-[11px] text-ink-400 mt-1">Find your perfect stay</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-iris-500/12 text-iris-300 border border-iris-500/25'
                    : 'text-ink-400 hover:text-ink-200 hover:bg-white/[0.04] border border-transparent'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Primary action pinned to the bottom */}
        <div className="px-4 pb-6">
          <NavLink
            to="/add"
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 4v16m8-8H4" />
            </svg>
            Add Hostel
          </NavLink>
        </div>
      </aside>

      {/* Mobile floating glass nav (below lg) */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[26rem]">
        <div
          className="flex items-center justify-around h-16 rounded-2xl border border-white/[0.08] bg-ink-900/80 backdrop-blur-xl"
          style={{ boxShadow: '0 16px 40px -12px rgb(0 0 0 / 0.8), 0 1px 0 0 rgb(255 255 255 / 0.06) inset' }}
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 h-full flex-1 rounded-2xl transition-all duration-200 ${
                  isActive ? 'text-iris-300' : 'text-ink-400 hover:text-ink-200 active:scale-95'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active glow pill behind icon+label */}
                  {isActive && (
                    <span
                      className="absolute inset-x-5 inset-y-2 rounded-xl bg-iris-500/12 border border-iris-500/25"
                      aria-hidden
                    />
                  )}
                  <Icon />
                  <span className="relative text-[11px] font-semibold tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg className="relative w-[22px] h-[22px] lg:w-5 lg:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="relative w-[22px] h-[22px] lg:w-5 lg:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}
