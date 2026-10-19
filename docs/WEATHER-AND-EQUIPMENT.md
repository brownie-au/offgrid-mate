# Prototype 2 — Weather and equipment

## Use

**Forecast → Auto / Manual** saves its mode immediately. Manual conditions save immediately and apply 100%, 65%, 30% or 10% of clear-day solar. Power sliders remain unapplied what-if changes until Apply.

In Auto, select one of 12 offline place presets or enter a location name, latitude and longitude. Coordinates work worldwide. The device-location button requests foreground location permission; denied or unavailable access leaves place/coordinate entry available. There is no general address geocoder, autocomplete API or background GPS tracking.

Auto displays forecast location, model issue time, successful check time/age, daily temperatures, precipitation, cloud cover and solar factor. Cached dates are matched to the forecast location's calendar and timezone. Old dates are never relabelled as new forecasts. Missing dates explicitly use saved Manual assumptions. Switching back to Manual restores the user's own conditions; downloads never overwrite them. Reconnecting in Manual makes no weather request.

The Android app is the main build. A downloaded HTML file supports offline planning but deliberately disables direct Auto-weather requests because it cannot identify a served website origin. Serve the web build from an appropriate HTTP(S) origin to test browser Auto mode; browser GPS needs a secure context or localhost.

**Appliances → Add appliance** now includes searchable Brand and Product/Model selectors. Pick a product to prefill the fields that have usable specifications. Source links, verification dates and assumptions appear in the editor. Edits remain user overrides. Online catalogue refresh updates available products, never values already applied to a setup.

Choose **Custom / Not listed** for optional brand/model and category-specific fields. Save a reusable custom copy if desired. Reuse, edit or delete saved copies in the editor. Deleting a saved copy does not delete instances already used in setups. Remove deletes the active instance.

Loads support watts × hours × duty, or measured daily Wh; daily Wh replaces the watt/duty calculation. AC inverter loss is applied once. Unknown startup draw is not invented. Quantity is applied once.

Solar, DC-DC and mains chargers replace their corresponding charging slot; they do not become consuming appliances or duplicate an existing source. Panels may replace rooftop or portable totals. Source quantity scales output. Inverters update efficiency/idle assumptions; rated output capacity is informational and is not treated as a constant load. Direct edits in Charging are retained when the linked item is reopened. Wrong nominal battery voltage is rejected for chargers/inverters.

Removing a combined DC-DC/MPPT controller zeros its alternator and MPPT paths. Removing a panel zeros that panel slot. Removing inverter specifications resets generic inverter assumptions (90% efficiency, 0 W idle); this simplified planner does not model an absent inverter as an AC disconnection.

## Provider and costs

MET Norway Locationforecast 2.0 provides a global forecast with no API key. Its data allow commercial use under CC BY 4.0 with attribution. Native requests identify OffGrid Mate and the GitHub repository. Coordinates are rounded to four decimals. Cache expiry and conditional requests are respected; duplicate requests are coalesced; errors/429 responses apply retry backoff. The app refreshes when relevant and foregrounded, not as a background polling service.

Terms: https://docs.api.met.no/doc/TermsOfService.html

Licence: https://api.met.no/doc/License

API: https://api.met.no/weatherapi/locationforecast/2.0/documentation

There is no SLA. MET requires an agreement above 20 requests/second across the whole application, not per installation. A caching proxy is recommended before a large public rollout. No paid service has been ordered and no runtime weather key is required.

Open-Meteo's hosted free tier was not selected because it is for non-commercial use. No paid commitment was made.

## Solar assumptions

Auto uses cloud observations from forecast intervals, not icon categories, to estimate attenuation: `1 − 0.75 × (cloud_fraction³)` (25–100%). Cloud cover is weighted over approximate 06:00–18:00 local daylight. This multiplies the existing clear-day peak-sun-hour assumption and panel/system yield once. It is not measured irradiance or a PV production forecast. It does not model astronomical sunrise, terrain, shading, panel direction or temperature. Today's weather may cover only the remaining hours; the UI shows available hours and uses those readings to estimate the day.

## Catalogue coverage and refresh

The starter catalogue has **12 products across 9 brands**: Renogy, Engel, REDARC, Victron Energy, EcoFlow, BLUETTI, Starlink, Goal Zero and Dometic. It covers solar, DC-DC/MPPT, mains chargers, inverters, fridges, communications and lighting. It is not an exhaustive brand/product database.

Ten entries have usable electrical planning prefills. Goal Zero Lighthouse 600 and Dometic CFX3 45 require manual consumption input: LED output or an unmatched annual energy label is not sufficient evidence of actual camping battery demand.

Engel MT-V80F uses a clearly labelled conversion of the stated 3.6 A upper range at an assumed nominal 12 V, producing 43.2 W. The source does not separate 12/24 V current values. It is not verified average draw or startup power; confirm the voltage, use measured draw and adjust the explicitly estimated duty cycle.

Manufacturer URLs, verification dates, numerical fields and caveats live in `public/equipment-catalogue.json`. The app loads a bundled catalogue, caches validated JSON updates, and falls back when offline or refresh fails. It does not scrape websites or require an AI browsing service. A maintainer verifies changed specifications before publishing a new JSON revision.

Prototype feed: https://raw.githubusercontent.com/brownie-au/offgrid-mate/feature/weather-equipment-catalogue/public/equipment-catalogue.json

Before commercial release, move `CATALOGUE_URL` to a stable release/main feed and keep it available. Until then, retain this branch. GitHub Raw has no application SLA; the bundled/cached catalogue remains usable if it is unavailable.

## Verification and remaining limits

50 automated tests pass: original energy/persistence checks, weather parsing/date alignment/cache/error cases, injected granted/denied/unavailable GPS outcomes, and DOM flows for manual persistence, Auto caching, stale labels, selection/autofill, custom reuse/deletion and source accounting. A live Cairns HTTP forecast request returned 200 and its response was parsed and schema-validated (see `live-weather-smoke.json`).

Native compilation, APK signature/archive checks and matching bundled web assets pass. The package is a debug test build. No Android device/emulator or browser visual automation was available: native permission dialogs, WebView networking, Android share/picker behaviour and final mobile appearance need real-device testing. DOM tests are not physical-device tests.

Google Play Billing and release signing remain outside this feature change and are not implemented. No store release or paid entitlement is claimed.
