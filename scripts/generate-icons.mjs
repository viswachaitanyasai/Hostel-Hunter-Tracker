/**
 * Generates every app icon from the mark defined below:
 *
 *   - Android launcher icons for all five densities (legacy square + round,
 *     plus the adaptive-icon foreground layer)
 *   - the PWA icons in `public/icons/`
 *   - `public/favicon.svg`, so the browser tab matches the installed app
 *
 * Run with `npm run icons`.
 *
 * Design: a solid iris-gradient building with a rounded, overhanging roof and a
 * 2x2 window grid punched clean through the mark, plus one warm amber window
 * echoing the rating stars. Earlier revisions used a thin 4px blue outline,
 * which disappeared at launcher sizes; solid fills and real holes stay legible
 * at 48px.
 *
 * The Android adaptive-icon plate colour lives in
 * `android/app/src/main/res/values/ic_launcher_background.xml` and must stay in
 * sync with PLATE below (it has to be a hex literal in XML).
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID_RES = path.join(ROOT, 'android/app/src/main/res');
const PUBLIC_ICONS = path.join(ROOT, 'public/icons');
const FAVICON = path.join(ROOT, 'public/favicon.svg');

// ── the design ──────────────────────────────────────────────────────────────

const PLATE = '#0f172a'; // ink plate; mirrors ic_launcher_background.xml
const IRIS_TOP = '#818cf8'; // iris-400
const IRIS_BOTTOM = '#4f46e5'; // iris-600
const WARM = '#f59e0b'; // amber — the rating-star accent

/** One gradient across the whole mark, not per shape. */
const IRIS = `<linearGradient id="iris" gradientUnits="userSpaceOnUse" x1="50" y1="9" x2="50" y2="88">
      <stop offset="0" stop-color="${IRIS_TOP}"/>
      <stop offset="1" stop-color="${IRIS_BOTTOM}"/>
    </linearGradient>`;

// Geometry in a 100x100 space. The roof is a stroked triangle so its corners
// come out rounded (stroke-linejoin) and the stroke gives the eave overhang
// past the walls — no hand-computed arcs needed.
const ROOF = 'M50 14 L85 46 H15 Z';
const ROOF_STROKE = 9;
const BODY = { x: 23, y: 42, w: 54, h: 45, r: 6 };

// 2x2 window grid, inset evenly into the walls (8px side margins, 8px gutter,
// 6px top/bottom margins, 7px gutter).
const WINDOW = { w: 15, h: 13, r: 3 };
const WINDOWS = [
  { x: 31, y: 48, warm: false },
  { x: 54, y: 48, warm: true }, // the lit one
  { x: 31, y: 68, warm: false },
  { x: 54, y: 68, warm: false },
];

const rect = ({ x, y, w, h, r }, fill) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" />`;

// The stroke pushes the roof's apex above the walls' flat base, which leaves the
// mark sitting ~1.75 units high in the viewBox. Nudge it down so the rendered
// artwork is centred inside the plate.
const NUDGE_Y = 1.75;
const centred = (inner) => `<g transform="translate(0 ${NUDGE_Y})">${inner}</g>`;

const svgFor = (viewBox, inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${
    defs ? `<defs>${defs}</defs>` : ''
  }${inner}</svg>`;

const roof = `<path d="${ROOF}" fill="url(#iris)" stroke="url(#iris)" stroke-width="${ROOF_STROKE}" stroke-linejoin="round" />`;
const walls = rect(BODY, 'url(#iris)');
const windowsWhere = (warm, fill) =>
  WINDOWS.filter((w) => w.warm === warm)
    .map((w) => rect({ ...w, ...WINDOW }, fill))
    .join('\n  ');

// Raster source: the mark with real transparent holes (punched via dest-out).
const MARK_SVG = svgFor('0 0 100 100', centred(`${roof}\n  ${walls}`), IRIS);
const HOLES_SVG = svgFor('0 0 100 100', centred(windowsWhere(false, '#fff')));
const WARM_SVG = svgFor('0 0 100 100', centred(windowsWhere(true, WARM)));

// Vector master for the browser: the plate is flat, so the windows can simply
// be filled with it instead of being punched.
const FAVICON_SVG = svgFor(
  '0 0 100 100',
  `<rect width="100" height="100" rx="22" fill="${PLATE}" />
  <g transform="translate(50 50) scale(0.74) translate(-50 -50)">
    ${centred(
      `${roof}\n    ${walls}\n    ${windowsWhere(false, PLATE)}\n    ${windowsWhere(true, WARM)}`,
    )}
  </g>`,
  IRIS,
);

// ── rendering ───────────────────────────────────────────────────────────────

const DENSITIES = [
  { dir: 'mipmap-mdpi', scale: 1 },
  { dir: 'mipmap-hdpi', scale: 1.5 },
  { dir: 'mipmap-xhdpi', scale: 2 },
  { dir: 'mipmap-xxhdpi', scale: 3 },
  { dir: 'mipmap-xxxhdpi', scale: 4 },
];

// The mark fills ~79% of its 100x100 viewBox, so these are scaled up to land
// the visible artwork at ~62% (legacy) and ~54% (adaptive safe zone) of the icon.
// Kept a step smaller than the mark's own bounds: at launcher size the roof and
// walls read as oversized next to other apps' icons, and the adaptive layer is
// masked on a circle whose safe zone is only ~61% of the canvas.
const LEGACY_ART_FRACTION = 0.79;
const ADAPTIVE_ART_FRACTION = 0.68;

const MASTER = 1024; // rasterise once, then downscale for clean edges

async function render(svg, size) {
  return sharp(Buffer.from(svg), { density: 1200 })
    .resize(size, size, { fit: 'fill' })
    .png()
    .toBuffer();
}

async function main() {
  // The mark, with its windows punched through and the warm one set back in.
  const holes = await render(HOLES_SVG, MASTER);
  const warm = await render(WARM_SVG, MASTER);
  const master = await sharp(await render(MARK_SVG, MASTER))
    .composite([
      { input: holes, blend: 'dest-out' },
      { input: warm, blend: 'over' },
    ])
    .png()
    .toBuffer();

  /** The mark, scaled so the artwork occupies `fraction` of a `size`px square. */
  const artAt = (size, fraction) =>
    sharp(master)
      .resize(Math.round(size * fraction), Math.round(size * fraction))
      .png()
      .toBuffer();

  /** Solid plate with the mark centred on it. */
  const squareIcon = async (size, fraction) =>
    sharp({ create: { width: size, height: size, channels: 4, background: PLATE } })
      .composite([{ input: await artAt(size, fraction), gravity: 'centre' }])
      .png()
      .toBuffer();

  /** As squareIcon, but knocked out to a circle for round launchers. */
  const roundIcon = async (size, fraction) => {
    const circle = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
        `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
    );
    return sharp(await squareIcon(size, fraction))
      .composite([{ input: circle, blend: 'dest-in' }])
      .png()
      .toBuffer();
  };

  /**
   * Adaptive foreground: a FULL transparent canvas of `size` px — Android
   * positions and masks this layer itself, so it must not be cropped to the
   * artwork's bounds.
   */
  const foregroundIcon = async (size, fraction) =>
    sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: await artAt(size, fraction), gravity: 'centre' }])
      .png()
      .toBuffer();

  await mkdir(PUBLIC_ICONS, { recursive: true });

  for (const { dir, scale } of DENSITIES) {
    const out = path.join(ANDROID_RES, dir);
    await mkdir(out, { recursive: true });

    await writeFile(
      path.join(out, 'ic_launcher.png'),
      await squareIcon(Math.round(48 * scale), LEGACY_ART_FRACTION),
    );
    await writeFile(
      path.join(out, 'ic_launcher_round.png'),
      await roundIcon(Math.round(48 * scale), LEGACY_ART_FRACTION),
    );
    await writeFile(
      path.join(out, 'ic_launcher_foreground.png'),
      await foregroundIcon(Math.round(108 * scale), ADAPTIVE_ART_FRACTION),
    );

    console.log(`✓ ${dir}`);
  }

  await writeFile(path.join(PUBLIC_ICONS, 'icon-192.png'), await squareIcon(192, ADAPTIVE_ART_FRACTION));
  await writeFile(path.join(PUBLIC_ICONS, 'icon-512.png'), await squareIcon(512, ADAPTIVE_ART_FRACTION));
  console.log('✓ public/icons (192, 512)');

  await writeFile(FAVICON, FAVICON_SVG);
  console.log('✓ public/favicon.svg');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
