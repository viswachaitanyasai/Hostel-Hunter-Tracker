# Hostel Finder — PWA Mobile App

## Overview

A mobile-first Progressive Web App (PWA) for finding and managing hostels. Built with React + TypeScript + Vite. Data is stored in IndexedDB (file-per-hostel style) on the device. Can be installed on a mobile phone's home screen as a standalone app.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Routing | React Router DOM 7 |
| Maps | Leaflet 1.9 + react-leaflet 5 (OpenStreetMap tiles, free, no API key) |
| Storage | IndexedDB (each hostel = 1 record, sorted by newest) |
| PWA | vite-plugin-pwa (Workbox, service worker with offline tile caching) |
| Native Bridge | Capacitor 8 (initialized, ready for Android/iOS builds) |
| Geolocation | Browser Geolocation API (with Capacitor fallback) |
| Icons | UUID v4 for IDs |

## Project Structure

```
hostel_freebuff/
├── AGENT.md                  # This file — documentation for AI assistants
├── src/
│   ├── main.tsx              # Entry point, imports Leaflet CSS
│   ├── index.css             # Tailwind directives + custom dark theme + Leaflet overrides
│   ├── App.tsx               # React Router setup (BrowserRouter)
│   ├── types/
│   │   └── index.ts          # Hostel interface, HostelFormData, AMENITIES_LIST
│   ├── storage/
│   │   ├── index.ts          # Storage abstraction: listHostels, createHostel, updateHostel, removeHostel, fileToBase64
│   │   └── indexeddb.ts      # IndexedDB CRUD: getAllHostels, getHostel, saveHostel, deleteHostel
│   ├── hooks/
│   │   └── useGeolocation.ts # useGeolocation() → { lat, lng, loading, error, getCurrentPosition, resetLocation }
│   ├── components/
│   │   ├── Layout.tsx        # Bottom nav bar (Home / Map icons) with safe-area padding
│   │   └── HostelCard.tsx    # Card with photo, rent badge, AC badge, location, amenity tags
│   └── pages/
│       ├── HomePage.tsx      # Header with search, 2-col grid, loading skeletons, empty state, FAB
│       ├── AddHostelPage.tsx # Full form: Camera + Gallery inputs, GPS detect, map picker, amenities
│       ├── HostelDetailPage.tsx # Photo gallery, details, mini-map, call/delete actions, delete confirm modal
│       └── MapPage.tsx       # Full-screen map with all hostel markers, popup cards with photo+details
├── public/
│   ├── favicon.svg           # Hostel-building SVG icon
│   └── icons/                # PWA app icons (192px, 512px)
├── dist/                     # Production build output (auto-generated)
├── capacitor.config.ts       # Capacitor config (appId: com.hostelfinder.app)
├── vite.config.ts            # Vite + React + Tailwind + PWA plugins with Workbox
└── package.json              # Dependencies and scripts
```

## Data Model

```typescript
interface Hostel {
  id: string;             // UUID v4
  name: string;           // Hostel name
  rent: number;           // Monthly rent in ₹
  location: {
    lat: number;          // Latitude
    lng: number;          // Longitude
    address: string;      // Reverse-geocoded address
  };
  hasAC: boolean;         // AC availability toggle
  photos: string[];       // Base64 data URLs
  contactNumber: string;  // Phone number
  description: string;    // Free text description
  amenities: string[];    // Selected from AMENITIES_LIST
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
```

## Storage Architecture

- **Production/Dev**: IndexedDB (`hostel-finder` database, `hostels` object store)
  - Each hostel is stored as a separate record (file-like architecture)
  - Photos are stored as base64 strings within each hostel record
  - Sorted newest-first on retrieval
- **Native (Capacitor)**: `@capacitor/filesystem` plugin (pre-configured, swap storage layer when building native)
- **Abstraction**: All storage goes through `src/storage/index.ts` — swap the implementation without touching pages

## Route Structure (App.tsx)

| Route | Page | Layout |
|---|---|---|
| `/` | HomePage (hostel grid) | Layout (bottom nav) |
| `/add` | AddHostelPage (form) | None (fullscreen) |
| `/hostel/:id` | HostelDetailPage | None (fullscreen) |
| `/map` | MapPage (map view) | None (fullscreen) |

## Key Design Decisions

1. **Camera + Gallery**: Two separate file inputs — camera uses `capture="environment"` (opens camera directly, one photo at a time), gallery uses `multiple` (multi-select from gallery). Both reset `e.target.value` after selection to allow re-capture.
2. **GPS Flow**: User clicks "Detect GPS" → browser geolocation API → position auto-fills on map → user can tap to adjust → reverse geocodes via Nominatim API.
3. **Maps**: OpenStreetMap tiles via Leaflet. Free, no API key. Map tiles are cached by the service worker for offline use.
4. **PWA**: Installs on mobile home screen via Chrome's "Add to Home Screen". Works offline thanks to Workbox service worker. Map tiles cached with CacheFirst strategy (200 entries, 30 days).
5. **Dark Theme**: Full dark theme with slate/blue color palette. Smooth transitions and hover states.

## Scripts

```bash
npm run dev        # Start development server
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build locally
npm run lint       # ESLint check
```

## How to Run / Test

```bash
# Development
cd hostel_freebuff && npm run dev

# Build
cd hostel_freebuff && npm run build

# Serve locally (for PWA testing)
cd hostel_freebuff && npx serve dist -l 3000

# Expose with HTTPS (for PWA install on phone)
npx ngrok http 5173
```

## How to Build Native Mobile App (Capacitor)

```bash
npm run build                          # Build web app first
npx cap add android                    # Add Android platform
npx cap sync                           # Sync web build to native
npx cap open android                   # Open in Android Studio
```

For iOS (requires Mac with Xcode):
```bash
npx cap add ios
npx cap sync
npx cap open ios
```

## Known Limitations

1. **Nominatim rate limit**: Reverse geocoding via openstreetmap.org has a 1 req/sec limit. Fine for personal use.
2. **Base64 photos**: Large photos can consume significant IndexedDB storage. Mobile browsers allow 50MB-1GB depending on device.
3. **Leaflet marker icons**: Loaded from CDN to avoid Vite bundling issues.
4. **PWA install**: Requires HTTPS. Use ngrok or deploy to Vercel/Netlify for the install prompt.
