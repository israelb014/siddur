# Decisions made while preparing the closed test

Where the brief left room, the most conservative option was taken and written down here.

## Fonts
- Google Fonts now serves Frank Ruhl Libre and Assistant as **variable** fonts: one woff2 per family and subset covers all weights (Frank Ruhl Libre 300–900, Assistant 200–800). So `/fonts/` holds 4 files (Hebrew + Latin for each family) instead of one per weight, and each `@font-face` declares a weight range. The requested weights (400/500/700/900 and 400/600/700/800) are all inside those ranges.
- OFL texts come from the google/fonts repository: `fonts/OFL-FrankRuhlLibre.txt`, `fonts/OFL-Assistant.txt`.

## Zmanim
- The previous sun formula (the SunCalc approximation) was up to 2.7 minutes off hebcal at sunset, which failed the 2-minute test. It was replaced by the NOAA solar-position algorithm (the same family hebcal uses), evaluated at each event's own time. The worst difference is now about 25 seconds.
- Elevation: horizon depression = 0.833° + 0.0347·√h, as specified. Places below sea level (Tiberias, stored as −200 m) are treated as sea level; hebcal also refuses negative elevations.
- Chatzot stays the midpoint of (elevation-adjusted) sunrise and sunset. Hebcal uses the sea-level solar transit; the two agree to within seconds.
- City coordinates and elevations are approximate city-centre values (±0.01°, elevation rounded). The city list shows the elevation used.
- The test compares against hebcal with `useElevation = true` and the same elevation per city.
- Times are shown in the device's time zone. The app targets Israel only, so no explicit `Asia/Jerusalem` conversion was added.

## Calendar
- Yom HaAtzmaut follows hebcal: the day after Yom HaZikaron (5 Iyar; Friday/Shabbat → Thursday; Monday → Tuesday). Yom Yerushalayim is 28 Iyar with no postponement, as in hebcal.
- Both are only no-Tachanun days. There is no Hallel and no other text change. Because the app already drops Tachanun at Mincha on the day before any no-Tachanun day, Mincha before them (Yom HaZikaron, 27 Iyar) also has no Tachanun. This is the existing generic rule, left unchanged.
- The geshem/tal and barech-aleinu checks derive the expected dates from hebcal's Hebrew-date conversion, because hebcal has no event for them: geshem from 22 Tishrei through 14 Nisan, and barech aleinu from 7 Cheshvan through 14 Nisan.

## App
- The keep-screen-on lock is requested whenever the app is visible and the toggle is on, because the app always shows a prayer. It is re-requested on `visibilitychange`, and any error is ignored.
- App version is `1.0.0` and is set in `tools/build.py` (`VERSION`).
- Inline notes and inserts pad each line fragment (`box-decoration-break: clone`). At 360px width this pushed the page 2px sideways. `#prayers` now clips with a 12px clip margin, so only the padded backgrounds are trimmed and no text is cut. The existing layout had the same overflow.
- Service worker: it now handles only same-origin requests. Navigations are cached per page (index.html and privacy.html separately), so visiting the privacy page can no longer overwrite the cached app shell.
- `manifest.webmanifest` uses absolute `/siddur/` paths for `id`, `start_url` and `scope`, as requested. The existing `icon-maskable-512.png` is full-bleed with the ring inside the 80% safe zone, so it was kept as the maskable icon.

## Store assets
- Screenshots: a 390×844 viewport at scale 2.77 gives 1080×2338, not 1080×2340. To get exactly 1080×2340, the viewport is 390×845 at scale 1080/390 (≈2.769).
- Google Play rejects phone screenshots whose long side is more than twice the short side, and 2340/1080 ≈ 2.17. So a second set at 1080×1920 (9:16) is in `store/screenshots-9x16/`. Upload that set; the 1080×2340 set is kept as requested.
- Screenshot dates: 1) Monday 2 Nov 2026, 07:20, Jerusalem, zmanim table open; 2) Tuesday 3 Nov 2026, Mincha, level "רגיל" selected; 3) 1 Cheshvan 5787 (12 Oct 2026), Ya'aleh VeYavo in the Amida; 4) 27 Kislev (7 Dec 2026); 5) Thursday evening 5 Nov 2026, dark mode, with a sample week of marks.
- Lighthouse 12 and later dropped the PWA category. The audit was run with Lighthouse 11.7.1, the last version that has it, and cross-checked with Chromium 141's own installability API.

## Repository
- Dev-only tooling (`@hebcal/core`, `playwright`, `lighthouse` scripts) lives in `tools/` with its own `package.json`. None of it is referenced by the app or precached.
