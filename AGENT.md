# Hostel Finder — PWA Mobile App

## Overview

A mobile-first Progressive Web App (PWA) for finding and managing hostels. Built with React + TypeScript + Vite. Data is stored in IndexedDB on the device. Can be installed on a mobile phone's home screen as a standalone app.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Routing | React Router DOM 7 |
| Maps | Leaflet 1.9 + react-leaflet 5 (ESRI World Imagery satellite tiles, free, no API key) |
| Storage | IndexedDB (each hostel = 1 record, sorted by newest) |
| PWA | vite-plugin-pwa (Workbox, service worker with offline tile caching) |
| Native Bridge | Capacitor 8 (initialized, ready for Android/iOS builds) |
| Geolocation | Browser Geolocation API (with Capacitor fallback) |
| IDs | UUID v4 |

## Project Structure

```
hostel_freebuff/
├── AGENT.md                  # This file — documentation for AI assistants
├── src/
│   ├── main.tsx              # Entry point, imports Leaflet CSS
│   ├── index.css             # Tailwind directives + custom dark theme + Leaflet overrides
│   ├── App.tsx               # React Router setup (BrowserRouter)
│   ├── types/
│   │   └── index.ts          # Hostel, HostelRent, HostelFormData interfaces + AMENITIES_LIST
│   ├── storage/
│   │   ├── index.ts          # Storage abstraction: listHostels, createHostel, updateHostel, removeHostel, fileToBase64
│   │   └── indexeddb.ts      # IndexedDB CRUD + migrateHostel() for backward compatibility
│   ├── hooks/
│   │   └── useGeolocation.ts # useGeolocation() → { lat, lng, loading, error, getCurrentPosition, resetLocation }
│   ├── components/
│   │   ├── Layout.tsx        # Bottom nav bar (Home / Map icons) with safe-area padding
│   │   └── HostelCard.tsx    # Card with photo, rent badge, rating badge, location, sharing options, amenity tags
│   └── pages/
│       ├── HomePage.tsx      # Header with search, filter panel, 2-col grid, loading skeletons, empty state, FAB
│       ├── AddHostelPage.tsx # Full form (add + edit via /edit/:id): Camera + Gallery inputs, GPS detect, satellite map picker, amenities, star rating, rent-per-share rows
│       ├── HostelDetailPage.tsx # Swipeable photo gallery with full-screen viewer, details, satellite mini-map, Open in Google Maps, call/edit/delete actions
│       └── MapPage.tsx       # Full-screen satellite map with all hostel markers, popup cards with photo+details+rating+Google Maps link
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
interface HostelRent {
  shares: number;         // Number of people per room
  rent: number;           // Monthly rent in ₹ for this sharing option
}

interface Hostel {
  id: string;             // UUID v4
  name: string;           // Hostel name
  rents: HostelRent[];    // Rent options per sharing (default: 3-shares only, user can add more)
  securityFee: number;    // Security deposit in ₹
  otherFines: string;     // Free text for fines & rules
  rating: number;         // Rating 1-5 (0 = unrated)
  location: {
    lat: number;          // Latitude
    lng: number;          // Longitude
    address: string;      // Reverse-geocoded address (Nominatim)
  };
  photos: string[];       // Base64 data URLs
  contactNumber: string;  // Phone number
  description: string;    // Free text description
  amenities: string[];    // Selected from AMENITIES_LIST (AC is part of this list, no separate hasAC field)
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
```

### Amenities List
```
Electricity Included, Food, Wi-Fi, AC, Laundry, Power Backup, Parking, Gym, Kitchen Access, TV, Fridge
```

### Migration (indexeddb.ts)
All data reads go through `migrateHostel()` which handles:
1. Old single `rent` field → converts to `rents: [{ shares: 1, rent }]`
2. Empty/missing `rents` → defaults to `[{ shares: 1, rent: 0 }]`
3. Missing `securityFee`, `otherFines`, `rating` → defaults to 0, '', 0
4. Legacy `hasAC: true` → pushes 'AC' into amenities array, deletes `hasAC`

The migration runs on **both** `getAllHostels()` (bulk list) and `getHostel()` (single record fetch via `getHostelById()`).

## Storage Architecture

- **Production/Dev**: IndexedDB (`hostel-finder` database, `hostels` object store)
  - Each hostel stored as a separate record
  - Photos stored as base64 strings within each hostel record
  - Sorted newest-first on retrieval
- **Native (Capacitor)**: `@capacitor/filesystem` plugin (pre-configured, swap storage layer when building native)
- **Abstraction**: All storage through `src/storage/index.ts` — swap implementation without touching pages

## Route Structure (App.tsx)

| Route | Page | Layout |
|---|---|---|
| `/` | HomePage (hostel grid + search + filters) | Layout (bottom nav) |
| `/add` | AddHostelPage (new hostel form) | None (fullscreen) |
| `/edit/:id` | AddHostelPage (edit mode, pre-fills data) | None (fullscreen) |
| `/hostel/:id` | HostelDetailPage | None (fullscreen) |
| `/map` | MapPage (satellite map view) | None (fullscreen) |

## Key Features & Design Decisions

### HomePage — Filters Panel
- Sticky header with search bar + filter toggle button
- Filter panel includes:
  - **Rent Range**: Min/max fields (compares against cheapest rent from rents array)
  - **Max Room Sharing**: 1–4 share buttons
  - **Minimum Rating**: 0–5 star filters (toggle on/off)
  - **Amenities**: Multi-select from AMENITIES_LIST
- Active filter count badge on the filter icon
- "Clear all filters" link when filters active
- Empty state differentiates "no hostels" vs "no matches" — shows clear filters or add hostel button
- Floating action button (FAB) to add new hostel

### AddHostelPage — Form
- **Photos**: Two buttons — Camera (`capture="environment"`, one at a time) and Gallery (`multiple`, multi-select). Both reset `e.target.value` after selection to allow re-capture. Photo grid with hover delete button.
- **Name**: Text input, required
- **Rent per Sharing**: Dynamic rows with shares (number) + rent (₹). Default: one row at 3 shares. "Add Share" button creates new row with next sequential share count. Remove button appears when > 1 row.
- **Security Fee**: Number input (₹)
- **Rating**: Interactive 1–5 star selector (yellow fill on selected)
- **Other Fines & Rules**: Free text area
- **Contact Number**: Phone input
- **Description**: Text area
- **Amenities**: Toggle buttons from AMENITIES_LIST
- **Location**: 
  - "Detect GPS" button uses browser Geolocation API → auto-fills position on map
  - **Satellite map** (ESRI World Imagery) — tap to set/adjust marker position
  - Address text field (auto-filled via Nominatim reverse geocode, editable)
- **Validation**: Name required, at least one valid rent > 0, location required
- **Edit Mode** (`/edit/:id`): Pre-fills all fields, calls `updateHostel()` on save

### HostelDetailPage — Photo Gallery
- **Header**: 72px photo area with:
  - Swipe left/right (touch events) to navigate between photos
  - Desktop arrow buttons (left/right) for non-touch navigation
  - Hover hint "Tap to view full screen" (group-hover)
  - Dot indicators at bottom
- **Full-Screen Viewer**: Tap photo to open full-screen overlay with:
  - Dark backdrop (`bg-black/95 backdrop-blur-xl`)
  - Close button (X), photo counter ("2 / 5"), dot strip
  - Touch swipe + desktop arrows for navigation
  - `object-contain` to fit image within viewport
- **Gradient overlay**: `pointer-events-none` so it doesn't block image clicks
- **Content sections**: Name, address, rating stars, cheapest rent, tags (call, sharing count), rent breakdown, description, amenities, fees & policies (security fee + fines), satellite mini-map, action buttons (View on Map, Edit, Delete)
- **Open in Google Maps**: Button opens `https://www.google.com/maps?q=lat,lng` in new tab
- **Delete**: Confirmation modal
- **Timestamps**: Creation and last updated date

### MapPage — Satellite View
- ESRI World Imagery satellite tiles as default
- Hostel markers with popup cards showing: photo thumbnail, name, cheapest rent, rating stars, amenity tags (max 3), "View Details" button + "Open in Google Maps" icon button
- Center calculated as average of all hostel coordinates (defaults to India center if none)
- Zoom level adapts: 12 if hostels exist, 5 if empty

### HostelCard — Grid Card
- Aspect ratio 4:3 photo with hover zoom effect
- Badges: Rent (top-right), Rating (bottom-left, yellow stars), Photo count (bottom-right)
- Details: Name, address with location icon, sharing options summary line, amenity tags (max 3 + "+N" overflow)
- Click navigates to `/hostel/:id`
- Hover: slight lift + border glow

### Layout — Bottom Nav
- Two tabs: Home (house icon) and Map (map icon)
- Active tab: blue highlight + scale effect
- Safe-area padding for notched phones (`safe-area-bottom`)
- Content has `pb-20` to avoid bottom nav overlap

## Key Design Decisions

1. **No separate AC field**: AC was originally a boolean `hasAC` toggle. It's now part of the amenities list. Old data with `hasAC: true` auto-migrates to add "AC" to amenities.
2. **Satellite maps everywhere**: All maps (add/edit form, detail page, map page) use ESRI World Imagery tiles instead of OpenStreetMap. Free, no API key required.
3. **Camera + Gallery**: Two separate file inputs for photo capture. Camera requires multiple taps for multiple photos.
4. **GPS Flow**: User clicks "Detect GPS" → browser geolocation API → position auto-fills on map → user can tap to adjust → reverse geocodes via Nominatim API.
5. **Rent sharing**: Default form shows only 3-share option. User adds more rows as needed. Validates at least one rent > 0.
6. **Full-screen photo viewer**: Click/tap photo → modal overlay with swipe support, close button, counter, dots, desktop arrows.
7. **PWA**: Installs on mobile home screen via Chrome's "Add to Home Screen". Works offline thanks to Workbox service worker. Map tiles cached with CacheFirst strategy (200 entries, 30 days).
8. **Dark Theme**: Full dark theme with slate/blue color palette. Smooth transitions and hover states.

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
5. **Touch events**: Swipe gestures use React touch event handlers. `preventDefault()` may not work in passive event listeners on some browsers (minor UX — swipe works but page may scroll slightly).
