# OffGrid Mate — Prototype 2

**Know your power. Enjoy your freedom.**

An offline camping energy planner built with React, TypeScript and Capacitor 8. Preloaded with Brownie's Savannah-X bank: two 300 Ah LiFePO4 batteries in parallel (600 Ah at 12.8 V), 200 W roof solar, 300 W blanket, adjustable 30 A output on a 50 A shared solar/DC-DC charger, fridge and Starlink Mini.

## New in Prototype 2

Forecast now has persistent Auto/Manual weather, native location permission, offline coordinate entry/presets, date-aware cached forecasts and a cloud-based solar estimate. Appliance Details includes a searchable 12-product / 9-brand manufacturer catalogue, source evidence, override preservation, reusable custom items and charging-source handling.

Read [the weather and equipment guide](docs/WEATHER-AND-EQUIPMENT.md) for controls, provider terms, data coverage and actual verification limits. No weather API key or paid service is required for this prototype.

## Run and build

```sh
npm ci
npm test
npm run build
npm run dev
```

`dist/index.html` is self-contained: scripts, fonts (system), charts, icons and illustrations have no network dependency. Open it locally for a desktop preview, or use the native Android build for stable app storage and native backup sharing. This is not a hosted PWA; no service worker is required for the bundled Android assets.

Android needs Java 21, an Android SDK with platform 36 and build tools, and `ANDROID_HOME` or an untracked `android/local.properties` containing `sdk.dir=...`.

```sh
npm run android:sync
cd android
./gradlew :app:assembleDebug --max-workers=2
# Installable test build:
# app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:bundleRelease --max-workers=2
# Unsigned release bundle, not ready for Play upload:
# app/build/outputs/bundle/release/app-release.aab
```

No release signing key is included or generated. Keep signing credentials outside this repository. `au.offgridmate.app` is a proposed application ID; confirm it before first Play Console registration.

## Implemented in this prototype

- Manual battery dashboard for nominal 12/24/48 V systems, including LiFePO4 bank voltages 12.8/25.6/51.2 V.
- Appliance add/edit/remove, schedules crossing midnight, quantity, duty cycle, DC and AC loads, inverter efficiency and idle consumption.
- Separate roof/portable solar, peak sun hours, conversion yield, MPPT current cap, seven manually selected weather days.
- DC-DC driving schedules and shared solar/DC-DC controller cap.
- Mains or generator-through-charger schedule, total battery charging limit and charge efficiency.
- Seven-day forecast using 15-minute steps, minimum and end-of-day SOC, reserve warnings and unserved load.
- What-if scenarios with an explicit Apply action; changes to saved settings discard stale simulations.
- Up to 20 persistent local setups, duplication, deletion and selection.
- Versioned JSON backup, full validation and replace confirmation before restore.
- Native Android backup export through the share sheet; browser JSON download.
- Persistent light/dark theme, mobile navigation and a responsive interface.
- Protective behaviour when local storage is corrupt or full.

All features are open for prototype testing. **Google Play Billing, paid entitlements and Free/Pro restrictions are not implemented.** No purchase can occur in this build. The A$14.99 lifetime price is a proposal, not a configured product.

## Engineering

- `src/engine.ts`: pure deterministic energy calculations, independent of UI/native APIs.
- `src/storage.ts`: schema v1, validation, defaults, persistence.
- `src/main.tsx`: interface, scenario state, native export boundary.
- `src/weather.ts` and `WeatherPanel.tsx`: MET integration, native location, date-aware caching and weather controls.
- `src/equipment.ts`, `catalogue.ts` and `EquipmentEditor.tsx`: catalogue validation, custom templates, autofill and source-slot integration.
- `src/style.css`: light/dark responsive layout and accessible control states.
- `tests/`: calculation, backup and DOM interaction tests.
- `android/`: generated Capacitor native project with branded launcher/splash assets.
- `docs/`: model assumptions, product decisions, verification and release work.

See `docs/MODEL.md` before treating an estimate as a hardware capability. See `docs/STATUS.md` for exactly what was tested and what remains unverified.
