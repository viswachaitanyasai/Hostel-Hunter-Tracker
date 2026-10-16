import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AddHostelPage from './pages/AddHostelPage';
import HostelDetailPage from './pages/HostelDetailPage';
import MapPage from './pages/MapPage';
import UpdateToast from './components/UpdateToast';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';

/**
 * Keyed by pathname so the enter animation replays on every navigation.
 * `fade` variant for map pages (avoids transforms around Leaflet panes).
 * Chrome (bottom nav) stays outside this wrapper so fixed positioning
 * is never affected by the animation's transform.
 */
function PageShell({ children, fade = false }: { children: ReactNode; fade?: boolean }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className={fade ? 'page-enter-fade' : 'page-enter'}>
      {children}
    </div>
  );
}

// Inside the native app shell there is no deployed bundle to update to, and the
// native build ships no service worker at all (see `--mode native` in
// vite.config.ts), so the PWA update prompt is never mounted.
const isNative = Capacitor.isNativePlatform();

/**
 * Routes the Android hardware back button (see the hook for the details). Mounted
 * here rather than in Layout because Layout only wraps `/` — without this, back
 * on /hostel/:id, /add, /edit/:id or /map would close the app.
 */
function AndroidBackButton() {
  useAndroidBackButton();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Global PWA update prompt (new version available / offline ready) */}
      {!isNative && <UpdateToast />}
      <AndroidBackButton />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="/add" element={<PageShell><AddHostelPage /></PageShell>} />
        <Route path="/edit/:id" element={<PageShell><AddHostelPage /></PageShell>} />
        <Route path="/hostel/:id" element={<PageShell><HostelDetailPage /></PageShell>} />
        <Route path="/map" element={<PageShell fade><MapPage /></PageShell>} />
        <Route path="*" element={<PageShell><HomePage /></PageShell>} />
      </Routes>
    </BrowserRouter>
  );
}
