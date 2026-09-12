import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AddHostelPage from './pages/AddHostelPage';
import HostelDetailPage from './pages/HostelDetailPage';
import MapPage from './pages/MapPage';

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

export default function App() {
  return (
    <BrowserRouter>
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
