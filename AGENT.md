# Hostel Finder — PWA Mobile App

## Overview

A mobile-first Progressive Web App (PWA) for finding and managing hostels. Built with React + TypeScript + Vite. Data is stored in IndexedDB on the device. Can be installed on a mobile phone's home screen as a standalone app.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) with custom **"Ink & Iris" dark design system** (see below) |
| Typography | Inter Variable (`@fontsource-variable/inter`, bundled locally — offline-safe) |
| Routing | React Router DOM 7 |
| Maps | Leaflet 1.9 + react-leaflet 5 (ESRI World Imagery satellite tiles + World Boundaries and Places label overlay, free, no API key) |
| Storage | IndexedDB (each hostel = 1 record, sorted by newest) |
| PWA | vite-plugin-pwa (Workbox, service worker with offline tile caching) |
| Native Bridge | Capacitor 8 — **Android platform added and configured** (`android/`); iOS not added yet |
| Geolocation | Browser Geolocation API on the web; `@capacitor/geolocation` (native provider) inside the Android app |
| IDs | UUID v4 |

## Project Structure

```
hostel_freebuff/
├── AGENT.md                  # This file — documentation for AI assistants
├── README.md                 # Project README (user-facing)
├── src/
│   ├── main.tsx              # Entry point, imports Leaflet CSS
│   ├── vite-env.d.ts         # Ambient types incl. virtual:pwa-register/react module
│   ├── index.css             # Tailwind directives + custom dark theme + Leaflet overrides
│   ├── App.tsx               # React Router setup (BrowserRouter) + mounts the Android back-button bridge
│   ├── types/
│   │   └── index.ts          # Hostel, HostelRent (with per-rent `ac`), HostelFormData interfaces + SHARE_OPTIONS + AMENITIES_LIST
│   ├── storage/
│   │   ├── index.ts          # Storage abstraction: listHostels, getHostelById, createHostel, updateHostel, removeHostel, fileToBase64, exportHostels, triggerDownload, parseImportFile, importHostels
│   │   └── indexeddb.ts      # IndexedDB CRUD for hostels (v3 DB), migrateHostel() for backward compatibility
│   ├── hooks/
│   │   ├── useGeolocation.ts # useGeolocation() → { lat, lng, timestamp, loading, error, getCurrentPosition, resetLocation } (30s timeout, fresh fixes)
│   │   └── useAndroidBackButton.ts # Routes the Android hardware back button through React Router (exits only at the root)
│   ├── native/
│   │   └── systemCamera.ts   # JS side of the hand-written Android plugin that opens the phone's camera app, rear lens first
│   ├── components/
│   │   ├── Layout.tsx        # Responsive chrome: left sidebar (lg+) / floating bottom nav (mobile) — Home / Map
│   │   ├── HostelCard.tsx    # Card with photo, rent badge, room rating badge, location, sharing options (incl. AC flags), feature tags
│   │   └── UpdateToast.tsx   # PWA update prompt ("new version available" → Refresh) + offline-ready toast
│   └── pages/
│       ├── HomePage.tsx      # Header with search, filter panel, 2-col grid, loading skeletons, empty state, FAB, export menu (Export Selected / Export All / Import JSON)
│       ├── AddHostelPage.tsx # Full form (add + edit via /edit/:id): Camera + Gallery inputs with drag-to-reorder photos, GPS detect/clear, satellite map picker (tap pin to remove), share buttons 1–5 with per-row AC/Non-AC toggle, "Other" toggles (incl. New Building/Hot Water/Water Purifier), star ratings, Indian comma formatting on money inputs
│       ├── HostelDetailPage.tsx # Swipeable photo gallery with full-screen viewer (download button), details, ratings, rent options with AC/Non-AC badges, satellite mini-map, Open in Google Maps, call/edit/delete actions
│       └── MapPage.tsx       # Full-screen satellite/street map with all hostel markers, popup cards with photo+details+room rating+Google Maps link
├── public/
│   ├── favicon.svg           # GENERATED — the app mark on a rounded plate (browser tab icon)
│   └── icons/                # GENERATED — PWA app icons (192px, 512px)
├── scripts/
│   └── generate-icons.mjs    # Renders every icon (all Android densities + PWA) from public/favicon.svg
├── android/                  # Capacitor Android project (app id com.hostelfinder.app)
│   ├── app/src/main/AndroidManifest.xml   # INTERNET + location + camera permissions
│   ├── app/src/main/java/…/SystemCameraPlugin.java  # ACTION_IMAGE_CAPTURE with the rear-lens extras (see decision 19)
│   ├── app/src/main/res/mipmap-*/         # Launcher icons (legacy + adaptive foreground)
│   ├── app/src/main/res/drawable/splash.xml  # Brand launch splash
│   └── app/src/main/res/values/           # App name, theme, ic_launcher_background + app_background colours
├── dist/                     # Production build output (auto-generated)
├── capacitor.config.ts       # Capacitor config (appId: com.hostelfinder.app, SystemBars style — see decision 20)
├── vite.config.ts            # Vite + React + Tailwind + PWA plugins with Workbox
└── package.json              # Dependencies and scripts
```

> **Removed in this revision:** TrackPage.tsx, useTracking.ts, trackingService.ts, and all route-tracking storage (the `trackedRoutes` IndexedDB store is deleted on DB upgrade to v3). The GPS route tracker feature no longer exists.

## Data Model

```typescript
interface HostelRent {
  shares: number;         // Number of people per room (1-5, chosen via share buttons)
  rent: number;           // Monthly rent in ₹ for this sharing option
  ac: boolean;            // Whether this option is an AC room. AC and Non-AC rows can coexist for the same share count (e.g. 3-sharing AC @ ₹8,000 AND 3-sharing Non-AC @ ₹6,500)
}

type ElectricityType = 'included' | 'fixed' | 'per_unit';
type HostelType = 'boys' | 'coliving';

interface Hostel {
  id: string;             // UUID v4
  name: string;           // Hostel name
  type: HostelType;       // Target demographic: 'boys' or 'coliving'
  rents: HostelRent[];    // Rent options per sharing (starts empty in the form; user adds via share buttons 1-5)
  securityFee: number;    // Security deposit in ₹
  otherFines: string;     // Free text for fines & rules
  // Specific ratings (replaced old general "rating" field)
  roomRating: number;     // 0-5
  peopleRating: number;   // 0-5
  googleMapsRating: number; // 0-5
  ownerRating: number;    // 0-3
  // Legacy rating (kept for backward compat migration)
  rating?: number;
  lockInPeriod: number;   // Lock-in period in months (0 = none)
  noticePeriod: number;   // Notice period in months (0 = none)
  foodIncluded: boolean;  // Whether food is included in rent
  foodCharges: number;    // Monthly food charges in ₹ (if food not included)
  electricityType: ElectricityType;  // 'included' | 'fixed' | 'per_unit'
  electricityAmount: number;  // Electricity amount in ₹ (if not included)
  location: {
    lat: number;          // Latitude
    lng: number;          // Longitude
    address: string;      // Reverse-geocoded address (Nominatim)
  };
  photos: string[];       // Base64 data URLs
  contactNumber: string;  // Phone number
  description: string;    // Free text description
  amenities: string[];    // "Other" features selected from AMENITIES_LIST (AC is NOT here anymore — it lives per rent row)
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
```

### Share Options & Amenities List

```
SHARE_OPTIONS = [1, 2, 3, 4, 5]   // share-count buttons in the rent section
```

"Other" features list (renamed from "Amenities"; AC and Food removed — AC is per-rent-row, Food is a dedicated hostel-level field):
```
Wi-Fi, Laundry, Power Backup, Parking, Gym, Kitchen Access, TV, Fridge,
Sufficient Sockets, Washing Machine, Balcony, New Building, Hot Water, Water Purifier
```
*(Note: 'New Building', 'Hot Water', and 'Water Purifier' were added as simple toggle chips. 'AC' was removed from this list — AC availability is now a boolean on each HostelRent row so a hostel can price AC and Non-AC rooms of the same share count separately. 'Food' was removed — food is handled by the dedicated Food Included/charges fields.)*

### Migration (indexeddb.ts — DB_VERSION 3)

The IndexedDB version was bumped **2 → 3**. The `onupgradeneeded` handler now deletes the legacy `trackedRoutes` object store (tracking feature removed). Hostel data is untouched by the version bump.

All data reads go through `migrateHostel()` which handles:
1. Old single `rent` field → converts to `rents: [{ shares: 1, rent, ac: false }]`
2. Empty/missing `rents` → defaults to `[{ shares: 1, rent: 0, ac: false }]`
3. **Every rent row is normalized to include `ac`** (defaults to `false`) and stripped of legacy per-row food/electricity fields — even for rows that already exist
4. Missing `securityFee`, `otherFines` → defaults to 0, ''
5. Missing `type` → defaults to `'coliving'`
6. Missing `lockInPeriod`, `noticePeriod` → defaults to 0
7. Missing `foodIncluded`, `foodCharges`, `electricityType`, `electricityAmount` → defaults to `true`, 0, `'included'`, 0 (values extracted from the first legacy per-rent row if present)
8. Legacy `hasAC: true` → sets `ac: true` on the **first rent row** (NOT added to amenities anymore), deletes `hasAC`
9. **`'AC'` is stripped from the amenities array** on every read (AC is per-rent-row now)
10. **Legacy 'Electricity Included' and 'Food' in amenities → removed** on every read (electricity and food are handled via dedicated fields)
11. **New specific ratings**: Old `rating` → mapped to `roomRating` and `peopleRating`; `ownerRating` proportionally scaled (3/5); new fields default to 0
12. **Legacy check fields → amenities**: Old `sufficientSockets: true` → pushes 'Sufficient Sockets' into amenities; same for `hasWashingMachine` → 'Washing Machine'; `hasBalcony` → 'Balcony'. Old boolean fields are deleted after migration.

The migration runs on **both** `getAllHostels()` (bulk list) and `getHostel()` (single record fetch).

## Storage Architecture

- **Production/Dev**: IndexedDB (`hostel-finder` database, **version 3**, `hostels` object store)
  - Each hostel stored as a separate record
  - Photos stored as base64 strings within each hostel record
  - Sorted newest-first on retrieval
  - The old `trackedRoutes` store is deleted during the v2→v3 upgrade
- **Native (Capacitor)**: `@capacitor/filesystem` plugin (pre-configured, swap storage layer when building native)
- **Abstraction**: All storage through `src/storage/index.ts` — swap implementation without touching pages

## Route Structure (App.tsx)

| Route | Page | Layout |
|---|---|---|
| `/` | HomePage (hostel grid + search + filters) | Layout (bottom nav) |
| `/add` | AddHostelPage (new hostel form) | None (fullscreen) |
| `/edit/:id` | AddHostelPage (edit mode, pre-fills data) | None (fullscreen) |
| `/hostel/:id` | HostelDetailPage | None (fullscreen) |
| `/map` | MapPage (satellite/street map view) | None (fullscreen) |

*(The `/track` route and TrackPage were removed along with the entire tracking feature.)*

`App.tsx` also mounts `<UpdateToast />` globally (outside all routes) so the PWA update prompt is reachable from every page.

## Key Features & Design Decisions

### HomePage — Export/Import
- Export menu button in header with dropdown:
  - **Export Selected** — enters selection mode: checkboxes appear on hostel cards, user selects/unselects, then exports as JSON
  - **Export All** — exports all hostels as JSON file with version info
  - **Import** — hidden file input for `.json` files, validates format via `parseImportFile()`, imports with new IDs (no overwrites), shows status toast

### HomePage — Filters Panel
- Sticky header with search bar + filter toggle button
- Filter panel includes:
  - **Rent Range**: Min/max fields (compares against cheapest rent from rents array)
  - **Room Sharing**: Multi-select chips for share counts 1–5 (from `SHARE_OPTIONS`) — a hostel matches if it offers **at least one** rent option whose share count is selected. Empty selection = no filtering.
  - **Minimum Room Rating**: 0–5 star filters (toggle on/off, uses `roomRating`)
  - **Other**: Multi-select from AMENITIES_LIST (renamed from "Amenities")
- Active filter count badge on the filter icon
- "Clear all filters" link when filters active
- Empty state differentiates "no hostels" vs "no matches" — shows clear filters or add hostel button
- Floating action button (FAB) to add new hostel

### AddHostelPage — Form
- **Photos**: Two buttons — **Camera** (opens the phone's own camera app, rear lens first, one shot per tap) and **Gallery** (`multiple`, multi-select, hidden file input). Camera goes through the native `SystemCamera` plugin when it's available (Android build) and `openCamera()` falls back to a hidden `capture="environment"` input otherwise; a photo that comes back as a base64 data URL is appended by `addCapturedPhoto(dataUrl)`, Gallery files go through `addPhotos(files)` (FileReader). Both append to `photos` (base64 data URLs) and the parallel `photoFiles`; Gallery also resets `e.target.value` after selection so the same file can be picked again. See decision 19 for why the camera route is native. Photo grid with drag-and-drop reorder (desktop) + arrow buttons (mobile), number badges, an always-visible delete cross (hover-revealed only on pointer devices — see decision 21), and a hint about the first photo being the card thumbnail.
- **Name**: Text input, required
- **Target Demographic**: Selection chips — "Boys" (blue, person icon) or "Co-living" (purple, group icon). Required.
- **Rent per Sharing (share-button pattern)**:
  - **No default row** — the form starts with zero rent rows
  - Five share-count buttons **1 / 2 / 3 / 4 / 5** (`SHARE_OPTIONS` from types). Tapping a button appends a rent row for that share count.
  - **Tapping the same share number again adds ANOTHER row for it** — this is how you add an AC option alongside a Non-AC one for the same share count (e.g. tap 3 → Non-AC row, tap 3 again → second row, toggle it to AC)
  - Each row: shares badge + **AC / Non-AC toggle button** (cyan when AC) + ₹ rent input (Indian comma formatting) + **up/down reorder arrows** + remove (×) button. Any row can be removed, including down to zero rows. Row order is user-controlled (via the arrows) and is preserved everywhere (detail page, cards).
  - The share buttons show a highlighted (blue) state when at least one row with that share count exists.
- **Food & Electricity** (common for all sharing types):
  - **Food**: Toggle buttons "Included" (green) / "Not Included" (red). If not included, shows ₹ input for monthly food charges.
  - **Electricity**: Three-button selection — "Included" (default), "Fixed Bill", "Per Unit". If Fixed Bill or Per Unit, shows ₹ input for the amount.
- **Security Fee**: Number input (₹)
- **Ratings**:
  - **Room Rating**: Interactive 1–5 star selector
  - **People Rating**: Interactive 1–5 star selector
  - **Google Maps Review**: Interactive 1–5 star selector
  - **Owner Rating**: Interactive 1–3 star selector
- **Indian number formatting**: Rent, security fee, food charges, and electricity amount inputs show Indian-style commas (`Intl.NumberFormat('en-IN')`). They use `type="text"` + `inputMode="numeric"` with a `stripNonDigits()` helper to strip non-numeric characters on change.
- **Policy & Agreements**: Lock-in Period and Notice Period dropdowns (None / 1–12 months)
- **Other Fines & Rules**: Free text area
- **Contact Number**: Phone input
- **Description**: Text area
- **Other**: Toggle chips from AMENITIES_LIST — section renamed from "Amenities"; includes New Building, Hot Water, Water Purifier
- **Location** (see GPS section below for behavior details)
- **Validation**: Name required, at least one rent row with rent > 0, location required
- **Edit Mode** (`/edit/:id`): Pre-fills all fields (including existing rent rows with their AC flags), calls `updateHostel()` on save

### AddHostelPage — Location & GPS
- **"Detect GPS" button** uses the browser Geolocation API via `useGeolocation()`:
  - `{ enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }` — the **30s timeout** accommodates cold GPS locks (first fix / indoors), and `maximumAge: 0` forces a **fresh fix** instead of a stale cached position.
  - **Every detect always applies the fix to the pin** — even in edit mode, even if a pin already exists, and even if the new coordinates equal the old ones. The effect is keyed on the fix `timestamp` returned by `useGeolocation()` (new state field), so a re-detect reliably re-fires and **corrects a wrong pin**. This fixes the old bug where the pin silently stopped updating after a manual map tap or a second detect.
  - While detecting, the button shows a spinner and is disabled.
- **Re-centering**: `MapCenterUpdater` re-centers + zooms (level 16) to the pin whenever `gpsFixTime` changes (a state value set from the GPS fix timestamp), so repeated detects re-center the map even at identical coordinates.
- **Clearing the pin — two ways**:
  1. **"Clear Pin" button** (red, next to Detect GPS; only visible when a pin exists) — removes the pin, clears the address field, and resets the GPS hook state via `resetLocation()`.
  2. **Tap the pin on the map** — the `Marker` has a click handler that calls the same clear logic. Because the default Leaflet marker's hitbox is small, an invisible `CircleMarker` (radius 14, transparent) is layered over the pin as a larger tap target. Both call `handleClearPin()`.
- **Map picker**: Tap anywhere on the satellite map to set/adjust the pin (manual tap resets `gpsFixTime` to `null` so it doesn't fight the GPS auto-center).
- Address text field auto-fills via Nominatim reverse geocode and remains editable.
- Validation still requires a pin before submit.

### HostelDetailPage
- **Header**: 72px photo area with swipe navigation, desktop arrows, "Tap to view full screen" hover hint, dot indicators
- **Full-Screen Viewer**: Dark backdrop, close/download buttons, photo counter, dot strip, swipe + arrows, `object-contain`
- **Content sections**: Name with type badge, address, **Ratings (Room/People/Google Maps/Owner)**, cheapest rent, tags (call, sharing count), **Rent Options list with per-row AC/Non-AC badges** (cyan "AC" / grey "Non-AC" pill next to each option), Food & Electricity card, description, **"Other" section** (renamed from Amenities), fees & policies, satellite mini-map, action buttons
- **Open in Google Maps**: Button opens `https://www.google.com/maps?q=lat,lng` in new tab
- **Delete**: Confirmation modal

### MapPage — Satellite View
- ESRI World Imagery satellite tiles + **World Boundaries and Places label overlay**; toggleable to OpenStreetMap street tiles
- Hostel markers with popup cards showing: photo thumbnail, name, cheapest rent, room rating stars, feature tags (max 3), "View Details" button + "Open in Google Maps" icon button
- Center calculated as average of all hostel coordinates (defaults to India center if none)
- Zoom level adapts: 12 if hostels exist, 5 if empty

### HostelCard — Grid Card
- Aspect ratio 4:3 photo with hover zoom effect
- Badges: Rent (top-right), Room Rating (bottom-left, yellow stars), Photo count (bottom-right)
- Details: **Name with type badge** (blue "Boys" or purple "Co-living"), address with location icon, **sharing options summary line including `(AC)` markers** per option (e.g. `3 sharing (AC) @ ₹8,000, 3 sharing @ ₹6,500`), feature tags (max 4 + "+N" overflow)
- Click navigates to `/hostel/:id`

### Layout — Responsive Chrome
- **Mobile (< lg)**: floating glass bottom nav — unchanged. **Two tabs**: Home (house icon) and Map (map icon) — the Track tab was removed. Active tab: blue highlight + scale effect. Safe-area padding for notched phones. Content has bottom padding to avoid nav overlap.
- **Desktop (lg and up)**: persistent **left sidebar** (`aside`, fixed, `w-60`) with brand block, Home/Map nav links (active = iris pill), and a pinned **Add Hostel** primary button at the bottom. Main content is shifted via `lg:pl-60` on the wrapper. The mobile FAB is hidden on `lg:` in favor of the sidebar button.

### Desktop Responsiveness (breakpoints)
- **HomePage**: header/filters/content widen to `lg:max-w-5xl`; grid `grid-cols-2 → md:3 → lg:4`; filters panel goes 2-column on `lg:`; header logo hidden on `lg:` (sidebar shows the brand).
- **AddHostelPage**: container `lg:max-w-4xl`; the whole form is a **2-column grid on `lg:`** (`grid-cols-1 lg:grid-cols-2`, error + Location + Photos + Submit span both columns via `lg:col-span-2`); map is `lg:h-96`.
- **HostelDetailPage**: content `lg:max-w-4xl`; hero photo `lg:h-[26rem]`; rent options 2-col on `sm:`; mini-map `lg:h-72`.
- **MapPage**: header container full-width on `lg:`; popup cards widen to `lg:min-w-[260px]`.

## Design System — "Ink & Iris"

All UI styling is centralized in `src/index.css` using Tailwind 4 `@theme` tokens + `@layer components` utility classes. Pages never hard-code surface colors; they use the component classes or ink/iris tokens.

### Palette
- **Ink (neutrals)**: near-black cool ramp `ink-950 #09090e` (page bg) → `ink-900/850/800` (cards/panels/inputs) → `ink-700…500` (borders/controls) → `ink-400…300` (secondary text) → `ink-200…100` (primary text)
- **Iris (accent)**: indigo ramp `iris-300/400/500/600` — all primary actions, active states, links, focus rings
- **Semantic accents**: cyan = AC, emerald = success/included, rose = danger/delete, amber = ratings/star, sky = Boys badge, fuchsia = Co-living badge
- **Ambient background**: body has fixed radial gradient glows (indigo top-center, sky top-right, purple left) over ink-950
- Borders are mostly `white/[0.06]`–`white/[0.12]` alpha strokes instead of solid greys

### Component classes (defined once in index.css, reused everywhere)
| Class | Purpose |
|---|---|
| `.card` | Base surface (ink-900/80, rounded-2xl, hairline border, layered shadow) |
| `.panel` | Elevated section surface for form/detail sub-blocks (ink-850/80) |
| `.btn-primary` | Gradient iris button with glow shadow + hover intensify |
| `.btn-secondary`, `.btn-danger` | Neutral / rose-outline buttons |
| `.icon-btn` | 40px square glassy icon button (headers) |
| `.input-field`, `.input-label` | Text inputs + labels (ink-800/60 fields, iris focus ring) |
| `.chip` / `.chip-selected` | Filter/amenity/share toggle chips (selected = iris glow) |
| `.pill`, `.pill-ac`, `.pill-nonac` | Tiny AC/Non-AC badges |
| `.tag` | Amenity tags |
| `.section-title` | Uppercase tracking-widest 11px headings |

### Other conventions
- **Bottom nav**: floating glass pill (`Layout.tsx`) — `backdrop-blur-xl`, iris glow pill behind active tab; content wraps in `pb-28`
- **Font**: Inter Variable loaded in `main.tsx` (font-feature settings cv11/ss01); theme font-sans wired via `@theme --font-sans`
- **Leaflet**: full dark override — dark popups, glassy zoom controls, slim scrollbars app-wide, dark attribution. The container **must stay its own stacking context** (`position: relative; z-index: 0; isolation: isolate`): its panes carry z-index 200–1000, and the container was previously unpositioned, so they escaped into the page root and painted over the sticky form header and over modal overlays.
- **Selected star ratings** use amber-400; unfilled use ink-700

### Motion (CSS-only, no animation library)
Defined in `src/index.css` `@layer components`; all decorative animation is disabled under `prefers-reduced-motion: reduce`.
| Class | Purpose |
|---|---|
| `.page-enter` | Page transition: fade + rise (0.4s, `backwards` fill so fixed children aren't trapped by a lingering transform) |
| `.page-enter-fade` | Opacity-only variant for map pages (transforms can interact with Leaflet panes) |
| `.stagger-children` | Direct children rise in sequence (40ms steps up to the 12th child, later children share the max delay). Used on: HomePage grid + skeleton grid + filters panel, AddHostelPage form, HostelDetailPage content stack |
| `.pop-in` | Small scale+rise for dynamically added rent rows and modal dialogs |
| `.overlay-in` | Fade for full-screen viewer + delete modal backdrop |
| `.toast-in` | Drop-in for the import status toast |

**Important**: page transitions animate page *content only* — `App.tsx` wraps standalone routes in a location-keyed `PageShell`, and `Layout.tsx` keys `<main>` — so the bottom nav (position: fixed) sits **outside** any transformed ancestor. Don't add `page-enter` to a wrapper containing fixed-position chrome. The map route uses `page-enter-fade` for the same reason.

## Key Design Decisions

1. **AC is per-rent-row, not an amenity**: AC was first a boolean `hasAC`, then an amenity chip, and now a boolean `ac` field on each `HostelRent`. Rationale: hostels commonly offer both AC and Non-AC rooms of the same share count at different prices, so AC must be part of the rent option itself. The form implements this with share buttons 1–5 (tap again to add a second row for the same count, then toggle it to AC). Old data migrates: `hasAC: true` marks the first rent row AC; stray 'AC' chips in amenities are stripped on read.
2. **No default rent row**: The rent section starts empty. The user explicitly builds the options via the 1–5 share buttons, matching what the hostel actually offers. Validation requires ≥1 row with rent > 0.
3. **Tracking feature removed**: TrackPage, useTracking, trackingService, the `/track` route, the Track nav tab, and all route storage were deleted. The IndexedDB `trackedRoutes` store is dropped in the v3 upgrade. `haversineDistance`/`calculateTotalDistance` helpers went with it.
4. **GPS reliability**: 30s timeout + `maximumAge: 0` for fresh fixes. Every detect applies the fix (keyed on fix timestamp) — re-detecting always corrects the pin, even in edit mode. Pin can be cleared via the red Clear Pin button or by tapping the pin itself (invisible CircleMarker overlay provides a generous tap target).
5. **"Other" replaces "Amenities"**: The features section is titled "Other" everywhere (form, detail page, filters). 'New Building', 'Hot Water', and 'Water Purifier' were added as toggle chips. Data field name (`amenities`) is unchanged to avoid a storage migration.
6. **Specific ratings replace general rating**: Four specific ratings (room, people, Google Maps out of 5; owner out of 3).
7. **Satellite maps everywhere**: All maps use ESRI World Imagery tiles (+ labels overlay). Free, no API key required. MapPage additionally offers an OSM street toggle.
8. **Food & Electricity are hostel-level**: Common across all sharing types, set once per hostel.
9. **Electricity not in feature list**: Dedicated dropdown (Included / Fixed Bill / Per Unit Meter) with conditional amount input.
10. **Target Demographic**: Selection chips (Boys / Co-living) required; displayed as a badge on cards and detail page.
11. **Policy & Agreements**: Lock-in period and notice period in months, displayed in Fees & Policies.
12. **Camera + Gallery**: Two separate routes; camera takes one photo per tap (system camera app via the native plugin, see decision 19), gallery accepts many.
13. **Indian number formatting** on all money inputs via `Intl.NumberFormat('en-IN')` + `stripNonDigits()`.
14. **Full-screen photo viewer** with swipe support, close button, counter, desktop arrows, download.
15. **PWA**: Installs on mobile home screen; works offline via Workbox service worker; map tiles cached CacheFirst (200 entries, 30 days).
16. **Dark theme, one source of truth**: The entire look lives in `src/index.css` ("Ink & Iris" design system — see section above). Changing the palette/theme = editing tokens there; pages only consume component classes and ink/iris tokens.
17. **PWA update flow without data loss** (`registerType: 'prompt'` + `UpdateToast.tsx`): deployed updates are never applied silently. The new service worker downloads and *waits*; the toast shows "A new version is available — Refresh to update, your saved hostels are safe". Clicking Refresh posts `SKIP_WAITING` to the SW, activates it and reloads. **IndexedDB (`hostels`) is never touched by this flow** — only hashed app-shell files are replaced (outdated precaches are cleaned via `cleanupOutdatedCaches`). Hostel data loss only ever came from manually clearing "site data" in the browser, which this flow makes unnecessary. A periodic `registration.update()` (hourly, from `onRegisteredSW`) picks up new deploys on long-lived sessions. **This flow is web-only** — the native Android build ships no service worker (`--mode native`) and `App.tsx` does not mount `<UpdateToast />` there.
18. **Android hardware back goes back, not out**: Capacitor 8's core has no back-button handling at all, so a back press fell through to the Activity's default and closed the app from any sub-page. `@capacitor/app` is now installed, and `useAndroidBackButton()` — mounted in `App.tsx` rather than `Layout`, because `Layout` only wraps `/` — subscribes to the `backButton` event. It returns with `navigate(-1)` when `window.history.state.idx > 0`, and calls `App.exitApp()` only at the root. `idx` is React Router v7's own history depth (`BrowserRouter` → `createBrowserHistory` writes it on every push/replace), so it matches exactly what `navigate(-1)` will do — unlike the WebView's `canGoBack()`, which still counts entries the router has replaced. Subscribing takes over Capacitor's default handler (which only drives the WebView history and leaves back a no-op at the root), so the explicit `exitApp()` is what keeps the button able to leave the app.
19. **System camera app, rear lens first (`SystemCameraPlugin`)**: Android has no *API* to choose a lens for `ACTION_IMAGE_CAPTURE` — all 30 `MediaStore` classes were checked and none carries a front/back extra — and Capacitor's file chooser only reports *that* capture was requested (`FileChooserParams.isCaptureEnabled()` is a boolean), so `capture="environment"` never reaches the camera app and it reopens whichever lens was used last. There *is* a widely honoured **de-facto extra set** though, which OEM camera apps (Samsung, Google, AOSP) and third-party ones (Open Camera) read, and which cross-platform plugins use for exactly this bug:

    ```java
    intent.putExtra("android.intent.extras.CAMERA_FACING", 0);        // 0 = rear, 1 = front
    intent.putExtra("android.intent.extras.LENS_FACING_BACK", 1);
    intent.putExtra("android.intent.extra.USE_FRONT_CAMERA", false);
    ```

    Those cannot be attached from JS, so `android/app/src/main/java/com/hostelfinder/app/SystemCameraPlugin.java` (registered in `MainActivity.onCreate`) launches the intent itself with `EXTRA_OUTPUT` pointing at a FileProvider URI in the app cache. It requests the CAMERA runtime permission first — since Android 11, calling a camera app that declares CAMERA throws otherwise — and returns the **full-size JPEG** as a base64 data URL, so nothing is re-encoded or downscaled and EXIF orientation survives (a canvas capture would have flattened it).

    An earlier revision captured in-app with `getUserMedia` (`facingMode: exact 'environment'`); that was removed because a phone's extra lenses (ultra-wide) are separate devices that `facingMode: 'environment'` can satisfy, so it could open the ultra-wide instead of the main rear camera. An extra is a *request*, not a guarantee: a camera app may ignore it, which is the one thing that can't be verified without the device.

20. **System bars match the app (`AppTheme.NoActionBar` + `SystemBars` config)**: the phone's navigation strip showed up as a grey band under the near-black UI. Two independent causes, both fixed:
    - *The colour.* `BridgeActivity.onCreate` switches the activity to `AppTheme.NoActionBar`, whose `Theme.AppCompat.DayNight.*` parent resolves `?android:attr/windowBackground` from the **device's** light/dark setting. Capacitor's `SystemBars` plugin paints that attribute onto the decor view, and it is what shows wherever the WebView doesn't reach — i.e. the strip the navigation bar sits on. In light mode that is grey. The theme now pins `windowBackground`, `statusBarColor` and `navigationBarColor` to `@color/app_background` (`#09090E`, ink-950, kept in sync with `src/index.css`) and turns off `enforceStatusBarContrast` / `enforceNavigationBarContrast` so Android 10+ doesn't lay its own translucent scrim over the bars.
    - *The icons.* `SystemBars` defaults to `style: DEFAULT`, which derives the bar icon colour from the device's light/dark setting too — dark icons on what is now a dark bar. `capacitor.config.ts` pins `plugins.SystemBars.style = 'DARK'`. That config lives in `capacitor.config.ts`, so it only reaches the app via `npm run android:sync` (which writes `android/app/src/main/assets/capacitor.config.json`).

    Deliberately **not** changed: the viewport meta has no `viewport-fit=cover`, so the WebView stays out of the bar insets and `SystemBars` keeps its default `insetsHandling: css`. Going edge-to-edge would mean auditing `env(safe-area-inset-*)` around the floating bottom nav (`fixed bottom-4`).

21. **Touch first — nothing interactive may be revealed only on hover**: the photo grid's delete cross was `opacity-0 group-hover:opacity-100`, so on a phone it never appeared (a touch screen has no hover); it looked correct in the browser purely because a mouse was present. It is now `opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100` — visible by default, hover-revealed only for a real pointer, with Tailwind also nesting the hover rule inside `@media (hover: hover)`. Use this pattern for any new hover affordance. Verifiable without a phone in headless Chromium: `--blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=1,availableHoverTypes=1` emulates `pointer: coarse` / `hover: none`, and the element's computed `opacity` should be 1 there and 0 (until hovered) on a desktop run of the same page.

## Scripts

```bash
npm run dev           # Start development server
npm run build         # TypeScript check + Vite production build (PWA, with service worker)
npm run build:native  # Same, but for the embedded native app (no service worker)
npm run preview       # Preview production build locally
npm run lint          # ESLint check
npm run icons         # Regenerate Android + PWA icons from public/favicon.svg
npm run android:sync  # build:native + cap sync android
```

## How to Run / Test

```bash
# Development
cd hostel_freebuff && npm run dev

# Build
cd hostel_freebuff && npm run build

# Serve locally (for PWA testing)
cd hostel_freebuff && npx serve dist -l 3000

# Expose with HTTPS (for PWA install + Geolocation on phone)
npx ngrok http 5173
```

## How to Build Native Mobile App (Capacitor)

The Android platform is **already added and configured** — app id `com.hostelfinder.app`,
label "Hostel Finder", location + camera permissions declared, brand launcher icons and
splash in place. You only need to run the build.

### Prerequisites

| Requirement | Notes |
|---|---|
| **JDK 17-21** | **Gradle 8.14.3 (pinned by Capacitor) rejects Java 22+.** Android Studio's bundled JBR is often newer, so point `JAVA_HOME` at a 17-21 JDK. |
| Android SDK | Platform 36 + build-tools. Either set `ANDROID_HOME`, or put `sdk.dir=...` in `android/local.properties` (gitignored). |
| Android Studio | Optional — only needed to run/debug the app on a device or emulator. |

### Build the APK

```bash
npm run android:sync      # build:native + cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a connected device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Or work in Android Studio

```bash
npm run android:sync
npx cap open android      # then Run ▸ Run 'app'
```

### Why `android:sync` instead of `cap sync`

`npm run android:sync` builds with `--mode native`, which **omits the Workbox service
worker**. Capacitor serves the app from `https://localhost`, where a service worker *does*
register and persists across app updates — a stale precache would keep serving the previous
build's `index.html` and hashed assets after every sync, breaking the app. Web builds keep
the full offline PWA behaviour, and `App.tsx` skips mounting `<UpdateToast />` natively.

### App icons & splash

The entire icon set comes from one place — the mark defined in
`scripts/generate-icons.mjs`: a **solid iris-gradient building** with a rounded, overhanging
roof and a 2x2 window grid punched through it, one window lit amber. (Earlier revisions used
a thin 4px blue outline on a translucent house, which disappeared at launcher sizes.)

```bash
npm run icons             # scripts/generate-icons.mjs (uses sharp)
```

That writes:

- the legacy square + round launcher icons **and** the adaptive-icon foreground layer, for
  all five Android densities (`mipmap-mdpi` … `mipmap-xxxhdpi`)
- `public/icons/icon-192.png` and `icon-512.png` for the PWA
- `public/favicon.svg` — the same mark on a rounded plate, so the browser tab matches the
  installed app

Windows are punched as **real transparent holes** (a `dest-out` composite), not
plate-coloured fills, so the adaptive foreground still reads correctly when Android masks or
theme-tints the icon. The artwork occupies ~62% of the legacy icon and ~54% of the 108dp
adaptive canvas, centred to within a pixel — measured, not assumed: render the PNG and take the
bounding box of the non-plate / non-transparent pixels.

The adaptive background colour is `values/ic_launcher_background.xml` (`#0F172A`, kept in
sync with `PLATE` in the script), and the launch splash is `drawable/splash.xml` (that
colour + a centred `@mipmap/ic_launcher_foreground`), replacing Capacitor's default white
bitmap splash on every orientation/density.

### Native plugins

| Plugin | Used for |
|---|---|
| `@capacitor/app` | Android hardware back button (`backButton` event) and `exitApp()` |
| `@capacitor/geolocation` | GPS for "Detect GPS" inside the app shell |
| `@capacitor/filesystem` | Pre-wired for native storage; **not used yet** — the app still runs on IndexedDB |
| `SystemCamera` (**hand-written**, `SystemCameraPlugin.java`) | The Camera button: opens the system camera app asking for the rear lens (decision 19) |

Hand-written plugins are not managed by `cap sync` — they are plain Java in
`android/app/src/main/java/…` and must be registered in `MainActivity.onCreate` (Capacitor only
auto-discovers plugins that ship as a Gradle library). Their JS side is a `registerPlugin()`
call, e.g. `src/native/systemCamera.ts`.

Installing a plugin is not enough: run `npm run android:sync` so it lands in
`capacitor.plugins.json` and the Gradle module graph, or the JS side will call into a plugin
that isn't there.

### iOS (requires a Mac with Xcode)

```bash
npx cap add ios
npx cap sync
npx cap open ios
```

## Known Limitations

1. **Nominatim rate limit**: Reverse geocoding via openstreetmap.org has a 1 req/sec limit. Fine for personal use.
2. **Base64 photos**: Large photos can consume significant IndexedDB storage. Mobile browsers allow 50MB-1GB depending on device.
3. **Leaflet marker icons**: Loaded from CDN to avoid Vite bundling issues.
4. **PWA install & Geolocation require HTTPS**: Use ngrok or deploy to Vercel/Netlify. (Geolocation also needs HTTPS or localhost.)
5. **Touch events**: Swipe gestures use React touch event handlers. `preventDefault()` may not work in passive event listeners on some browsers (minor UX — swipe works but page may scroll slightly).
6. **AC filter scope**: The Room Type filter matches hostels that offer *at least one* AC (or Non-AC) option — it doesn't filter individual rent rows in the results display.
7. **Native builds need JDK 17-21**: Capacitor pins Gradle 8.14.3, which does not support Java 22+ (it fails with `Unsupported class file major version 69` on Java 25). Android Studio's bundled JBR may be newer than that — point `JAVA_HOME` at a 17-21 JDK before running Gradle.
8. **Android launcher icon is the only icon source for the app itself**: the `android/` project is committed, but `android/app/src/main/assets/public/` and `capacitor-cordova-android-plugins/` are gitignored build output — regenerate them with `npm run android:sync`.
9. **The camera's rear-lens request is a convention, not an API**: `SystemCameraPlugin` sets the extra set camera apps read, but nothing obliges an app to honour it (nor to keep the main rear lens rather than an ultra-wide). Android exposes no supported way to pick a lens.
10. **Camera photos are now full-resolution**: the system camera app saves its normal shot, so a single photo can be several MB before base64 encoding (the removed in-app capture re-encoded a ~720p video frame, a few hundred KB). Storage per photo therefore went up noticeably — downscale in the plugin if that becomes a problem.
