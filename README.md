# 🏠 Hostel Finder

A mobile-first **Progressive Web App (PWA)** for finding, comparing, and managing hostels — built for personal hostel hunting. Take photos on-site, drop a pin on a satellite map, record rents per sharing type (with AC/Non-AC pricing), and browse everything later in a searchable, filterable gallery — fully offline.

## ✨ Features

### 📋 Hostel Management
- **Add / Edit / Delete hostels** with a rich mobile-first form
- **Photos**: Capture with camera or pick from gallery; drag-and-drop (or arrow-button) reordering — the first photo becomes the card thumbnail
- **Full-screen photo viewer** with swipe navigation and download

### 💰 Rent per Sharing (AC & Non-AC)
- Tap share buttons **1–5** to add rent options (no defaults — add only what the hostel offers)
- Each rent row has an **AC / Non-AC toggle** — a hostel can have both, e.g. `3-sharing AC @ ₹8,000` and `3-sharing Non-AC @ ₹6,500`
- Indian-style comma formatting (`12,500`) on all money inputs

### 📍 Location
- **Detect GPS** — one tap fills your current position on the map (30s timeout for cold GPS locks; every detect re-applies the pin)
- **Satellite map picker** (ESRI World Imagery) — tap anywhere to set/adjust the pin
- **Clear pin** — tap the pin on the map or hit the red "Clear Pin" button
- Automatic **reverse geocoding** (Nominatim) to fill in the street address

### ⭐ Ratings & Details
- Four ratings: **Room** (0–5), **People/Vibe** (0–5), **Google Maps review** (0–5), **Owner** (0–3)
- **Food & Electricity**: included/not-included, fixed bill, or per-unit meter with charges
- **Policy & Agreements**: lock-in period, notice period, security fee, other fines & rules
- **Other features**: Food, Wi-Fi, Laundry, Power Backup, Parking, Gym, Kitchen Access, TV, Fridge, Sufficient Sockets, Washing Machine, Balcony, New Building, Hot Water, Water Purifier

### 🔍 Browse & Search
- 2-column grid of hostel cards with rent badge, room-rating badge, and sharing options summary
- **Search** by name, address, or feature
- **Filters**: rent range, max room sharing, minimum room rating, features
- **Full map view** (satellite or street tiles) with popup cards for every hostel

### 💾 Data Ownership
- All data stored **locally in IndexedDB** — no server, no account
- **Export Selected / Export All** as JSON, **Import** JSON backups (new IDs, no overwrites)
- Old exports are auto-migrated when imported

### 📱 PWA
- Installable on your phone's home screen (Add to Home Screen)
- Works **offline** — service worker caches app shell and map tiles

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| Maps | Leaflet 1.9 + react-leaflet 5 (ESRI World Imagery + labels overlay — free, no API key) |
| Storage | IndexedDB (one record per hostel) |
| PWA | vite-plugin-pwa (Workbox service worker) |
| Geolocation | Browser Geolocation API |
| Native (optional) | Capacitor 8 (pre-configured for Android/iOS builds) |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Development

```bash
npm install
npm run dev        # Start dev server at http://localhost:5173
```

### Production build

```bash
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview the production build locally
```

### Install as an app on your phone

The PWA install prompt requires **HTTPS**. Easiest options:

```bash
# Option 1: expose the dev server with ngrok
npx ngrok http 5173

# Option 2: build and serve the production bundle
npm run build && npx serve dist -l 3000
```

Open the HTTPS URL on your phone → **Add to Home Screen** → launch as a standalone app.

### Build as a native app (optional)

```bash
npm run build
npx cap add android    # first time only
npx cap sync
npx cap open android   # opens Android Studio
```

For iOS you need a Mac with Xcode: `npx cap add ios && npx cap sync && npx cap open ios`.

## 📁 Project Structure

```
├── AGENT.md                  # Detailed architecture doc for AI assistants
├── src/
│   ├── App.tsx               # Router setup
│   ├── types/index.ts        # Hostel, HostelRent models + amenities list
│   ├── storage/              # IndexedDB abstraction (swap-out for Capacitor FS)
│   ├── hooks/useGeolocation.ts
│   ├── components/           # Layout (bottom nav), HostelCard
│   └── pages/                # Home, Add/Edit, Detail, Map
├── public/                   # PWA icons
├── capacitor.config.ts       # Capacitor config
└── vite.config.ts            # Vite + Tailwind + PWA plugins
```

## 🗄 Data Model (essentials)

```typescript
interface HostelRent {
  shares: number;  // people per room
  rent: number;    // monthly rent in ₹
  ac: boolean;     // AC or Non-AC option — both allowed for the same share count
}

interface Hostel {
  name: string;
  type: 'boys' | 'coliving';
  rents: HostelRent[];
  roomRating: number;   // 0-5
  peopleRating: number; // 0-5
  googleMapsRating: number; // 0-5
  ownerRating: number;  // 0-3
  foodIncluded: boolean; foodCharges: number;
  electricityType: 'included' | 'fixed' | 'per_unit'; electricityAmount: number;
  lockInPeriod: number; noticePeriod: number;
  securityFee: number; otherFines: string;
  location: { lat: number; lng: number; address: string };
  photos: string[];      // base64 data URLs
  contactNumber: string; description: string;
  amenities: string[];   // "Other" features
  createdAt: string; updatedAt: string;
}
```

## 📝 Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

## ⚠️ Known Limitations

- **Reverse geocoding** uses Nominatim (1 req/sec rate limit) — fine for personal use
- **Base64 photos** in IndexedDB can consume significant storage on low-end devices
- **HTTPS required** for PWA install and the browser Geolocation API — use ngrok/deployment when testing on a phone
- Map **marker icons** load from unpkg CDN, so first map render needs network (tiles are cached after)

## License

Personal project — free to use and modify.
