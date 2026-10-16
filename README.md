# 🏠 Hostel Finder

A mobile-first **Progressive Web App (PWA)** for finding, comparing, and managing hostels — built for personal hostel hunting. Take photos on-site, drop a pin on a satellite map, record rents per sharing type (with AC/Non-AC pricing), and browse everything later in a searchable, filterable gallery — fully offline.

<div align="center">

<br>

<!-- Core Status & License Badges -->
[![Release](https://img.shields.io/github/v/release/viswachaitanyasai/Hostel-Hunter-Tracker?style=flat-square&color=blue&include_prereleases)](https://github.com/viswachaitanyasai/Hostel-Hunter-Tracker/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

<!-- Key Tech Stack Badges -->
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Capacitor](https://img.shields.io/badge/Capacitor_8-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)

<br>

<!-- Main Download Call to Action -->
<a href="https://github.com/viswachaitanyasai/Hostel-Hunter-Tracker/releases/latest">
  <img src="https://img.shields.io/badge/Download_APK-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download Hostel Finder APK">
</a>

</div>

## ✨ Features

### 📋 Hostel Management
- **Add / Edit / Delete hostels** with a rich mobile-first form
- **Photos**: Take them with your phone's own **camera app**, asked for the **rear lens** (one photo per tap), or pick several from your gallery; drag-and-drop (or arrow-button) reordering — the first photo becomes the card thumbnail
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
| Native | Capacitor 8 — **Android app configured**, builds a real APK |

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

### Android app

The Android project (`android/`) is already set up — app id `com.hostelfinder.app`, location
and camera permissions, brand launcher icons and a matching splash screen. The theme paints the
window and both system bars with the app's own background colour, so the phone's navigation strip
blends into the app instead of showing up as a grey band. It also carries one
hand-written native plugin, `SystemCameraPlugin.java`, which opens the phone's camera app with
the rear lens requested; that is the only place the request can be made, because Android's
file-chooser bridge drops the `capture` attribute (see AGENT.md, decision 19).

**Requires a JDK 17-21.** Capacitor pins Gradle 8.14.3, which rejects Java 22+; Android
Studio's bundled JBR is often newer than that, so point `JAVA_HOME` at a 17-21 JDK first.

```bash
npm run android:sync        # build for native, then sync into the Android project
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk

adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Or drive it from Android Studio:

```bash
npm run android:sync
npx cap open android        # then Run ▸ Run 'app'
```

Use `npm run android:sync`, not plain `npx cap sync`: it builds with `--mode native`, which
leaves out the service worker. Inside the native shell a service worker would register on
`https://localhost` and outlive app updates, serving stale assets after every sync.

For iOS you need a Mac with Xcode: `npx cap add ios && npx cap sync && npx cap open ios`.

## 📁 Project Structure

```
├── AGENT.md                  # Detailed architecture doc for AI assistants
├── src/
│   ├── App.tsx               # Router setup
│   ├── types/index.ts        # Hostel, HostelRent models + amenities list
│   ├── storage/              # IndexedDB abstraction (swap-out for Capacitor FS)
│   ├── hooks/              # useGeolocation, useAndroidBackButton
│   ├── native/             # systemCamera.ts — JS handle on the Android camera plugin
│   ├── components/           # Layout (bottom nav), HostelCard
│   └── pages/                # Home, Add/Edit, Detail, Map
├── public/                   # favicon.svg + PWA icons (both generated)
├── scripts/                  # generate-icons.mjs — the app mark, rendered for Android + PWA
├── android/                  # Capacitor Android project (build with npm run android:sync)
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
- **Base64 photos** in IndexedDB can consume significant storage on low-end devices — the camera
  button saves your camera app's **full-resolution** shot, so each photo is several MB before encoding
- **HTTPS required** for PWA install and the browser Geolocation API — use ngrok/deployment when testing on a phone
- Asking the camera app for the **rear lens** relies on a widely honoured but unofficial intent
  extra — Android has no API for it. A camera app is free to ignore it (and to pick the lens itself),
  so on some devices the first shot may still open on the last-used lens
- **Building the Android app needs a JDK 17-21** — Capacitor's pinned Gradle 8.14.3 does not support newer Java

## License

Personal project — free to use and modify.
