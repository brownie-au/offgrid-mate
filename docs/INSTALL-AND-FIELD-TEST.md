# Install and field test

## Start

Use the Android APK for the phone prototype. Download it to the phone, open it and follow Android's installer prompts. It is a debug-signed test build, not a Play Store release.

For a quick desktop review, open `OffGrid-Mate-Prototype-2.html` in a modern browser. All application assets are embedded. Desktop and Android local data are separate; use My setups → Export backup and Restore to transfer configurations.

Export a backup before uninstalling or replacing a debug build. Debug signing can differ between development machines; uninstalling to change signatures clears local app data. No production signing identity has been selected.

## Suggested Savannah-X test

1. Open the app and confirm Savannah-X shows 600 Ah at 12.8 V.
2. Set starting charge to the Renogy monitor reading in My setups.
3. Enter measured fridge and Starlink watts, fridge duty cycle and expected daily hours.
4. In Charging, check roof 200 W, blanket 300 W, DC-DC output setting and combined controller cap against the installation and exact device manual.
5. In Forecast, try clear weather, then three overcast/rainy days. Change portable solar and daily driving. Observe minimum SOC, reserve warnings and unmet demand. Apply only the plan to keep.
6. Duplicate the configuration before experimenting with a smaller bank or alternative equipment.
7. Export backup; restore it and check all setups and device values survive.
8. Repeat in airplane mode, force-stop/relaunch, and restart the phone. Check saved values and both themes.
9. Test a file chooser, native backup sharing, the Android Back gesture, rotation, keyboard entry and large font settings. Record the phone/Android version and any clipped controls.
10. Compare the next actual 24-hour energy balance with the prediction. Adjust measured assumptions and record why. Do not infer electrical compatibility from the forecast.

A good first feedback report: phone model, Android version, screen/page, action taken, expected result and actual result. Screenshots are useful for layout defects.

## Prototype 2 checks

Try Auto with GPS allowed and declined, then a listed place or entered coordinates. Disconnect and check cached age and fallback labels. Switch Manual and reconnect: manual conditions must remain. Select Engel and Renogy entries, override values, reopen them, save/reuse/delete a custom copy, and compare battery predictions before/after. Native permission and visual checks remain unverified until run on a real device. A downloaded HTML preview supports Manual planning; use the Android app or a served preview for Auto weather.
