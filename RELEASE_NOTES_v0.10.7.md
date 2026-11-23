# NFSU2.xyz Modern HUD v0.10.7 — Maintenance Update

**Chromium + Firefox | Release following public v0.10.4**

This release improves analog-gauge readability, RX-7 status placement, dashboard warning lamps and Firefox compatibility. It keeps the previous nine HUD styles, independent panels, configurable Screen Shake, materials, 3D Glass, read-only Car Feed, estimated odometer and Limp Mode.

## RX-7: four warning icons in a two-by-two layout

- Left of the RPM gauge: TYRES above ENGINE.
- Right of the RPM gauge: SUSP above HANDBRAKE (Space).
- Icons enlarged from 40px to 44px and lamps from 15px to 16.5px (10% larger).
- The rows line up horizontally; warning icons and lamps avoid overlapping adjacent circles.
- Disabling the fourth Handbrake icon does not shift the other three.

## Gauge-number readability

Adjusted dial-label positioning so numeric values no longer touch tick marks in the RX-7 Nitro/Turbo/RPM gauges and the speedometers of GT-R, Corolla, Civic, Nissan 350Z, Evo VIII / WRX STi and Supra / RX-8. KM/H and MPH variants were accounted for.

## GT-R and Corolla: status lamps instead of captions

TYRES, ENGINE, SUSP and HAND captions beneath the analog warnings have been replaced by warning lamps:

- **Dim:** normal / inactive.
- **Amber:** warning.
- **Red:** critical alert or active Handbrake.

GT-R uses rounded pill lamps; Corolla uses small rectangular lamps. Modern Digital retains its text labels.

## Firefox / Chromium compatibility fixes

Includes intermediate v0.10.5 improvements to the Firefox strict-CSP UI and dial rendering, including GEAR/ODO positioning and replacing direct dynamic `innerHTML` writes with extension-owned DOM updates.

## Unchanged features

Standalone Status HUD, Pedals HUD, customizable Screen Shake and impact diagnostics, Limp Mode with its misfire behavior, Speed Sensation Vignette, 3D Glass and Colors & Materials, car-specific odometers, custom keyboard shortcuts, and the read-only Car Feed remain available.

No new gameplay images are part of this update. [Existing screenshots](README.md#screenshots) are retained.

## Download and upgrade

**[Download Latest](downloads/NFSU2_Modern_HUD_LATEST_MultiBrowser.zip)** · **[Choose Version](DOWNLOADS.md)**

The package contains `NFSU2-HUD-Chromium/` and `NFSU2-HUD-Firefox/`. Copy the updated files over the **same existing installed extension folder**, reload in your browser's extension manager, then refresh NFSU2.xyz. Preserve the extension identity to keep its browser-local odometer data; exported settings profiles do not contain mileage.

Unofficial fan-made extension; not affiliated with NFSU2.xyz. Some warning and performance effects are estimates based on Car Feed data and must be evaluated in the game.
