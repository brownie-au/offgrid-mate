# Product direction

The core question is: "Can I stay another night and keep the fridge and Starlink running?"

## Competitor review, 19 October 2026

Official sources reviewed:

- Victron Toolkit provides equipment calculators and product-specific tools: https://www.victronenergy.com/blog/2024/09/04/introducing-the-victron-toolkit-app/
- EcoFlow describes monitoring and configurable charging/power behaviour for its devices: https://www.ecoflow.com/au/app and https://play.google.com/store/apps/details?id=com.ecoflow
- BLUETTI describes energy consumption, solar, battery state, scheduling and management: https://www.bluettipower.com/pages/app/ and https://play.google.com/store/apps/details?id=net.poweroak.bluetticloud

Inference for OffGrid Mate: lead with a simple battery and daily energy picture, then expose a useful seven-day camping plan across mixed-brand equipment. Keep it usable without an account or reception. This is a positioning hypothesis, not evidence of product-market fit, market size or willingness to pay.

## Proposed Free and Pro split

Free: one setup, appliance planning, basic daily estimates, light/dark mode and backup/restore. Users must always be able to recover their data.

Pro, proposed A$14.99 lifetime: multiple setups, multi-day forecasts, per-day weather scenarios, richer comparisons and a printable/shareable trip power report. The exact split and price remain product decisions to validate with campers.

Prototype 1 deliberately leaves planning features available and performs no sales or entitlement checks. No recurring infrastructure is required for its planning features.

## Billing release work

Use a Google Play one-time, non-consumable product, provisionally `offgrid_mate_pro_lifetime`. Display the localized price returned by Play, rather than a hard-coded production price. Support purchase, pending purchases, cancellation, restore and already-owned flows. Grant Pro only after verified purchase state; acknowledgement must occur within Google's required period. Verify on a secure service and handle refunds/revocations when online. Cache a verified entitlement so paid planning works offline; never treat an editable localStorage boolean as proof of purchase.

Official references:

- https://developer.android.com/google/play/billing/lifecycle/one-time
- https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers
- https://support.google.com/googleplay/android-developer/answer/16430488

Requires the owner's Play Console app/product setup, developer account access, release signing and license-test accounts. Those are not available in this session. Billing code and sandbox verification remain outstanding; the UI clearly says purchases are unavailable.

## Prototype 2 priorities

1. Test on Brownie's Android phone in airplane mode, including force-stop/relaunch, native backup sharing/restoration, keyboard entry, system Back, large text and both themes.
2. Calibrate against measured fridge/Starlink draw and actual solar/DC-DC behaviour. Confirm the precise Renogy controller manual and setup before adding a dedicated hardware preset.
3. Add flexible trip start date/time, different charging/driving schedules per day, weather-adjusted fridge consumption and saved scenario comparisons.
4. Add a concise trip report and stronger onboarding for users unfamiliar with Ah versus Wh.
5. Implement and sandbox-test billing with secure purchase validation and reliable offline entitlements.
6. Validate the price and Free/Pro split with real users before a commercial release.
