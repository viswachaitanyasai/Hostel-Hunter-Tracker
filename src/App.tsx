import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AddHostelPage from './pages/AddHostelPage';
import HostelDetailPage from './pages/HostelDetailPage';
import MapPage from './pages/MapPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="/add" element={<AddHostelPage />} />
        <Route path="/edit/:id" element={<AddHostelPage />} />
        <Route path="/hostel/:id" element={<HostelDetailPage />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}
