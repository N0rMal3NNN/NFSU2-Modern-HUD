# NFSU2 Modern HUD — Changelog

All notable changes to the unofficial NFSU2.xyz Modern HUD browser extension. **Latest: v0.11.58 BETA (desktop extension). Userscript BETA 5 (phones and tablets, v0.11.26.5) is based on v0.11.26.**

This cumulative changelog describes the updates **since the first public GitHub release, v0.9.9**, including additions, adjustments and regression fixes. Versions not listed here were not distributed as separate ZIP milestones.

## v0.11.58 BETA — Frontvex Phone, GPS & Automatic Speedometer (PC)

Cumulative desktop update since v0.11.26: Frontvex phone with customizable 2D/3D design, wallpaper and apps; game weather and GPS speed markers; automatic model-based HUD selection and manual per-Car-ID assignments; controlled-beta contacts, messaging, notifications and embedded verification; compact help popups and save reliability improvements. v0.11.57 fixes the embedded Turnstile iframe on compatible Chromium browsers (live verification confirmed). v0.11.58 automatically refreshes the connection after successful registration or re-registration without disrupting routine renewal or overriding disabled communication settings (live reconnection test pending). Full details: [v0.11.58 release notes](RELEASE_NOTES_v0.11.58.md). Special thanks to [OBD Gaming](https://www.facebook.com/overbudgetgg) for the idea behind the Frontvex in-game phone. Mobile update is not ready; BETA 5 remains available.

## Userscript BETA 5 — iPhone and Android (v0.11.26.5)

One universal userscript for **Safari + Userscripts (iPhone / iPad)** and **Microsoft Edge + Tampermonkey (Android)**, now based on the v0.11.26 code. Details: [RELEASE_NOTES_v0.11.26.md](RELEASE_NOTES_v0.11.26.md#userscript-beta-5-for-phones-and-tablets).

- Includes the Honda S2000, Integra Type R and Impreza RS HUD styles, the material library, Drink, the Speed Sensation fix and the cleaned-up TYRES lamp from v0.11.26.
- New **DRINK** button in the ⚙ launcher (visible only while Drink is enabled); the Drink overlays also stay visible in fullscreen.
- Smaller phone defaults for the new cluster styles (28 %).
- **Updated phone installation guide:** Tampermonkey imports the **ZIP** (Utilities → Import from file) or uses the direct ZIP link; Userscripts on iPhone needs the **`.js`** file moved into the Userscripts folder. Update steps from BETA 4 are included.
- Tested on real phones, on both iPhone and Android.

[Userscript BETA 5](downloads/NFSU2_Userscripts_BETA_5.zip) | [Installation guide](INSTALLATION.md#phones-and-tablets-userscript-beta-5)

---

## v0.11.26 — New HUD Styles, Material Library, Drink and Speed Sensation Update

Cumulative public Chromium release covering all development versions since v0.11.10. Details: [RELEASE_NOTES_v0.11.26.md](RELEASE_NOTES_v0.11.26.md).

### New HUD styles
- **Honda S2000 (AP1) — Digital LED Cluster:** LED-bar tachometer (100 rpm steps, red segments flash at the redline), 7-segment speed, odometer and TRIP A with a reset button; Colors & Materials supported.
- **Honda Integra Type R (DC2) — Analog Twin Dial:** twin dials with small TURBO and NITRO gauges, gear display, odometer and warning lights.
- **Subaru Impreza RS — Twin Dial + Centre Display:** twin dials, a centre display with gear, NITRO bar, odometer and warning lights, and an analogue TURBO gauge below it.
- Integra and Impreza share one smooth "hood" housing, have per-gauge position and size controls and a **Speedometer scale** choice (Game scale 0–400 km/h or Real car 0–180 km/h).
- Honda S2000, Honda Integra Type R and Subaru Impreza 2.5 RS added to the car list with matching default HUD styles.

### Colors & Materials
- 23 additional textures (7 needle, 9 bezel, 7 dial-background materials) for all analog HUD styles except the Modern HUD; new **Needle material** selector.

### Drink (optional, default OFF)
- Beer or whisky bottle in a gloved hand, rebindable shortcut (default `Ctrl + Alt + B`), optional police warning, drunk look and controls effect.

### Windshield glass
- Cracks appear on the side of the impact, with a **Flip left / right impact side** option.
- Dust after driving on dirt and grass, clearly visible, 20 s long with the last 5 s fading; the menu shows the surface reported by the game.

### Handbrake lamp
- Follows the game's own handbrake value (Car Feed); `Space` is only a fallback when the game does not send it.

### Speed Sensation (fix)
- Streaks, Blue Fog and the vignette follow the live Car Feed and work with the main HUD switched off; all three stop while paused or not driving.
- New live status line in the menu (active / why not) and a vignette help text that shows the real Start speed.

### TYRES lamp
- Reacts only to real wheel slip. The sudden-hard-brake estimate and the **ABS-style brake input** slider were removed; BRAKE is only a text label while the pedal is pressed. A previously saved value of the removed slider is ignored.

## v0.11.10 — Windshield, HUD Position and Menu Keyboard Update + Userscript BETA 4

Cumulative public Chromium release covering development versions v0.11.8, v0.11.9 and v0.11.10, and the first public phone/tablet userscript.

### HUD X/Y Position (v0.11.10)
- New **HUD X Position** and **HUD Y Position** (slider ±1000 px plus precise pixel fields) and a Reset button.
- Each HUD style remembers its own X/Y; saved with SAVE ALL and in the settings JSON.
- Independent of the existing per-dial offsets; applied to the outer HUD container, separately from the HUD scale.

### Standalone Status HUD (v0.11.10)
- The TYRES / ENGINE / SUSP panel appears only while live driving telemetry is arriving; hidden before the feed starts, while paused and after the feed stops.

### Menu keyboard input (v0.11.9)
- Typing, selecting, copy/paste and navigation in HUD settings fields are handled natively by the browser while a menu field has focus; game controls and HUD shortcuts do not interfere.
- `Esc` closes the menu from an edit field.

### Windshield collision detection (v0.11.8)
- Windshield cracks use their own impact samples and threshold, independent of Impact Feedback, Helmet, suspension and Limp Mode.
- Default *Crack on impacts from* is now 3.0 m/s (range 3–20 m/s); saved values are preserved.
- Medium cracks at 2× and large cracks at 4× the threshold, up to 5 cracks at once.
- A conservative sudden-speed-loss fallback is used only when impact telemetry is missing.
- No cracks are created while the game is paused.

### Userscript BETA 4 — iPhone and Android (v0.11.10.4)
- Userscript based on the v0.11.10 code for **Safari + Userscripts (iPhone / iPad)** and **Microsoft Edge + Tampermonkey (Android)**.
- One small **⚙** button; HUD, ON/OFF and SAVE stay hidden until it is pressed.
- The ⚙ can be moved with a finger and remembers its position **separately for Portrait and Landscape**.
- **Android support:** Car Feed connection through the page window used by Tampermonkey, with a bounded automatic reconnect when the feed goes stale; messages from other windows are rejected.
- **Android / Car Feed Debug** section in the menu: local-only report with Copy and Reconnect buttons.
- Overlays (HUD, windshield, helmet, cigarette, menu and the ⚙) stay visible when the game goes fullscreen.
- Windshield cracks: new **Max cracks on screen** option — **2 (phone default)**, 3, 4 or Standard (up to 5). The oldest crack is removed first; the desktop extension keeps Standard (5).
- Touch-friendly settings menu with live changes and auto-save; the ⚙ is hidden while the menu is open and stays available when the HUD is OFF.
- Smaller, performance-friendly mobile defaults (HUD scales, *Eco* mode); desktop defaults are unchanged.
- Separate settings and odometer storage from the desktop extension. This is a BETA.
- First Android beta tester: **RacerXC**.

### Compatibility
- Desktop extension: Google Chrome, Microsoft Edge, Brave, Opera / Opera GX, Vivaldi and other Chromium-based desktop browsers.
- Userscript BETA 4: iPhone / iPad — Safari + Userscripts (working); Android — Microsoft Edge + Tampermonkey (working, tested with RacerXC). Other Android browsers and managers are not tested.

[Download v0.11.10](downloads/NFSU2_Modern_HUD_v0_11_10_Chromium.zip) | [Userscript BETA 4](downloads/NFSU2_Userscripts_BETA_4.zip) | [Release Notes](RELEASE_NOTES_v0.11.10.md)

---

## v0.11.7 — Cigarette, Helmet & Driving Immersion Update

Public Chromium release combining immersive cockpit effects and improved tyre slip detection.

### Cigarette
- Glowing ember, ash and animated smoke.
- Three selectable positions: Left, Center and Right.
- Adjustable size (50–150%).
- Adjustable smoke intensity (0–100%).
- Smoke Animation ON/OFF.
- Automatic Ember Puff effect.
- Speed-sensitive smoke movement.
- Customizable HUD layering.
- 7-second preview.
- Disabled by default.

### Helmet View — 2 Helmet Models
- GT Full-Face Helmet.
- Open-Face Sport Helmet.
- Adjustable opacity (0–100%).
- Adjustable visor opening size (90–130%).
- Customizable HUD layering.
- Shake on Impact ON/OFF.
- Adjustable shake intensity (0–100%).
- Helmet shake preview.
- Automatically hidden when paused.
- Disabled by default.

### Windshield Glass
- Customizable reflections, dust and wiper marks.
- Adjustable sun strip with custom colors.
- Three windshield crack patterns.
- Shattered windshield during Limp Mode.
- Automatic crack fading.
- Central visibility protection.
- Disabled by default.

### Fixed: SLIP Light
- Reworked tyre slip detection using Car Feed telemetry.
- Fixed false warning activation during sharp cornering without actual tyre slip.
- Improved lateral slip and wheel spin detection.
- Improved wheel-to-ground contact detection.
- Improved filtering of temporary slip signals.
- Increased slip detection threshold.
- Retained the 550 ms detection confirmation time.
- Added real-time tyre slip telemetry diagnostics.
- ABS and braking detection remain unchanged.
- Applies to all HUD styles and Standalone Status HUD.

### Compatibility
- Google Chrome
- Microsoft Edge
- Brave
- Opera / Opera GX
- Vivaldi

[Download v0.11.7](downloads/NFSU2_Modern_HUD_v0_11_7_Chromium.zip) | [Release Notes](RELEASE_NOTES_v0.11.7.md)

---

## v0.11.5 — Immersive Cockpit Overlays and TYRES Warning Retuning

Public Chromium-only release bringing together the visual additions from development versions v0.10.8 through v0.11.4, plus one new TYRES tuning adjustment.

- **Windshield Glass:** optional full-screen reflection, dust, wiper marks, sun strip with custom color, impact cracks, Limp shattered glass and central visibility protection. Independent effect toggles and intensities. Default OFF.
- **Helmet View:** GT Full-Face and Open-Face Sport; model selector, opacity, opening size, placement in front of/behind HUD, impact shake toggle, intensity and preview. Default OFF.
- **Cigarette overlay:** 3D-style cigarette with glowing ember and animated smoke; enable, position, size, smoke amount and toggle, automatic ember puff, optional speed-sensitive smoke, HUD layer placement and preview. Default OFF.
- **TYRES sensitivity:** retained v0.10.8's +5% increase; now adds another **10% on top**. Slider is multiplied by **1.155**; 3.4 m/s setting gives an effective **3.927 m/s** slip/spin threshold. One-wheel extreme slip uses the same scaling. Existing hold-time filter, BRAKE and ABS unchanged.
- All previous HUD styles, standalone panels, driving controls, odometer, profiles and Car Feed read-only behavior retained.

Full details: [v0.11.5 release notes](RELEASE_NOTES_v0.11.5.md).

## v0.10.7 — RX-7 Warning Layout, Gauge Labels and Status Lamp Fixes

Public maintenance release following v0.10.4. This release is distributed for Chromium-based desktop browsers.

- **RX-7 status indicators:** four lamps and icons aligned as two columns around the RPM gauge: TYRES/ENGINE left, SUSP/HANDBRAKE right. Icons and lamps are 10% larger; all remain clear of the instrument rings. With Handbrake disabled, the other three retain the same positions.
- **Gauge label spacing:** corrected numeric-label overlaps with tick marks in the RX-7 Nitro, Turbo and RPM gauges, as well as the GT-R, Corolla, Civic, Nissan 350Z, Evo/STi and Supra/RX-8 speed gauges, in KM/H and MPH.
- **GT-R Analog and Corolla Retro:** replaced TYRES/ENGINE/SUSP/HAND text captions with individual warning lamps (dim normally, amber for warnings, red for critical/handbrake). Modern Digital keeps its captions.
- **Strict-CSP compatibility (included from v0.10.5):** improved GEAR/ODO and dial label rendering under strict Content Security Policy, replacing dynamic `innerHTML` assignments with safe DOM-based updates.
- **RX-7 intermediate v0.10.6:** reworked status positions to avoid overlapping neighboring dial rings. The final v0.10.7 two-by-two layout supersedes this intermediate arrangement.
- All seven previously published gameplay screenshots remain unchanged. No new screenshots in this release.

[Download v0.10.7](downloads/NFSU2_Modern_HUD_v0.10.7_Chromium.zip) · [Release notes](RELEASE_NOTES_v0.10.7.md)

---

## v0.10.4 — Four New HUD Styles, 3D Glass, Independent Panels & Improved Screen Shake

Public cumulative release following **v0.9.77**. Release artifact: `downloads/NFSU2_Modern_HUD_v0.10.4_Chromium.zip` (Chromium).

### New dashboards
- Audi A3 / TT instrument cluster with automatic A3/TT variant or manual override.
- Nissan 350Z / Infiniti G35 linked three-dial layout and model-specific colors/materials.
- Mitsubishi Lancer Evolution VIII / Subaru Impreza WRX STi instrument style, with Evo white/red and STi blue/gold variants.
- Toyota Supra / Mazda RX-8 cowled instrument style, with model-specific analog/digital speed presentation.
- Honda Civic refreshed with an EP3-inspired three-dial cream-face cluster. Existing Modern, GT-R, Corolla and RX-7 styles preserved.

### New visual customization
- Adjustable 3D-style glass/reflection/wear layer for analog HUDs, plus GT-R fitted Housing.
- Separate Colors & Materials for analog HUD styles: needles, numbers/ticks, redline, ODO, housing and dial face; matte/satin/glossy/chrome/brushed metal/carbon/leather.
- More consistent needle reach, rolling ODO digits across styles, better warning icon sizing and improved shift lamps.

### Independent HUDs
- Standalone TYRES/ENGINE/SUSP status panel, later including handbrake, with independent ON/OFF, size, X/Y, opacity, colors and horizontal/vertical layout.
- New Pedals HUD: live THR/BRK visual bars, three placement options, independent scale, layout and colors.
- Handbrake warning symbol added to all nine main styles and Standalone HUD; active while holding `Space` during driving. It follows the key, **not direct Car Feed handbrake state**.

### Impact, Limp Mode and usability
- **Screen Shake fix:** light collisions may shake visible HUDs; shake works on main/Standalone/Pedals elements and provides Last Collision diagnostics.
- **New Screen Shake option:** allow shake even if Windows/browser Reduce Motion is enabled.
- Independent Limp Mode and status display with the main custom speedometer OFF; engine misfire has a 55% chance of a 1.5s input cut.
- Optional corner-darkening Vignette within Speed Sensation, with adjustable intensity.
- Searchable/categorized settings, more precise layout controls and preserved shortcut customization.

Screenshots: seven original gameplay images supplied by the project owner; see README and `RELEASE_NOTES_v0.10.4.md`.

---


## v0.9.77 — Public Chromium Build

This download includes the five HUD styles and features described below, for Chromium-based desktop browsers.

## v0.9.73 — Three New Analog HUDs, TKL Shortcuts & Compatibility

Compared with the previous public release **v0.9.31**.

### New HUD styles
- **Toyota Corolla Retro (AE86-inspired):** classic connected instrument cluster, mechanical rolling GEAR and ODO displays, integrated TYRES/ENGINE/SUSP indicators.
- **Honda Civic Si (EM1-inspired):** white analog dials, a dual Nitro/Turbo instrument, RPM-based VTEC simulation (ON at 5,600 RPM), green shift LEDs, rolling GEAR and ODO.
- **Mazda RX-7 FD:** asymmetric carbon cluster, independent Turbo/Nitro/RPM/Speed gauges, KM/H or MPH selection and integrated status lights.

### New controls
- **User-configurable keyboard shortcuts** for Menu, HUD Toggle and SAVE ALL, including tenkeyless (TKL) keyboards, managed in the HUD settings and extension popup.
- **Ctrl + Alt + M** always opens/closes the menu as a backup binding.
- Wider HUD scaling range, new independent per-skin layout controls, calibrated **X/Y = 0 px** defaults with migration of older profiles, and automatic car-to-HUD assignment support.
- Rolling GEAR digits added to GT-R Analog; rolling ODO animation added to the new Honda and Corolla styles.

### Improvements and fixes to previously public features
- Corrected the Modern HUD final RPM label ('10') overlapping the COILOVER indicator.
- Improved settings menu rendering in strict CSP environments and improved cross-browser styling compatibility.
- Preserved per-model ODO storage, keyboard default bindings, saved profiles, Car Feed integration and previously shipped effects.

## v0.9.31 — Modern HUD Layout & ODO Spacing

### Improved
- Reduced Modern HUD internal width from 520 px to 500 px to reduce unnecessary empty space on the right.
- Raised the RPM group 6 px; lowered ODO 8 px and SHIFT 16 px for clearer vertical separation; speed readout remains in place.
- Added subtle **1 px spacing between ODO digits** in Modern and GT-R Analog styles.
- Preserved GT-R Analog circle sizes/positions, compact/cockpit dimensions, 31-model mileage and 100 m autosaves.

## v0.9.30 — Odometer Persistence & Autosave Fixes

### Fixed
- Added automatic mileage checkpoints at **every 100 metres** (instead of every 100 km), with periodic and exit saves retained.
- Fixed menu/HUD mismatch caused by rounding versus truncating tenths of a kilometre.
- Stored last selected car model separately and recovered it along with per-car mileage after browser restart.
- Added canonical V3 ODO storage, migration from older V2 records and a backward-compatible V2 copy.
- Kept the `Numpad *` save with browser-storage read-back verification.

## v0.9.29 — Responsive Multi-Column Menu & Save Verification

### Added / Improved
- Widened settings panel automatically flows whole sections into **1–4 columns**; individual sliders, inputs and controls do not stretch.
- Increased maximum odometer reading to **9,999,999.9 km** (0.1 km resolution).

### Fixed
- Fixed the **false “Save incomplete — retry”** message when driving caused mileage to change during a save.
- Verified the saved snapshot instead of comparing it to a continuously updating in-memory reading; improved asynchronous save retry behavior.

## v0.9.28 — 31 Car Odometers & Numpad Quick Save

### Added
- **Odometer — Mileage by Car** menu, manually selecting one of 31 game models (including Peugeot 106 and Vauxhall Corsa).
- Separate total for each selected **model**; switching models restores that model's mileage.
- **Modern Digital HUD odometer LCD** below speed and above SHIFT; GT-R Analog ODO remains inside the speed dial.
- **Numpad `*`** shortcut to save both active settings and all car mileage without entering the menu.
- Per-model reset with double confirmation; legacy v0.9.27 standalone mileage preserved as “Previous ODO (unassigned)”.

### Notes
- Two different physical vehicles of the same model share mileage. Odometer is estimated by the extension and is not part of the game's own save or exported settings JSON.

## v0.9.27 — GT-R Analog Customization & First Odometer

### Added
- Repositioned TYRES/ENGINE/SUSP around the analog speed-dial center; added a compact ODO LCD below gear.
- Introduced local mileage estimation from Car Feed speed and elapsed time, with reset and periodic/checkpoint saves.
- Added customizable needle/numbers/tick colors, illumination and optional analog dial depth; original colors remain defaults.

### Fixed
- Menu resize no longer stretches section contents, inputs or sliders.

## v0.9.24 — Tyre Symbol & Adjustable Blue Fog

### Improved
- Restored the **tire/wheel with tread** for TYRES in both HUD styles.
- Moved TYRES and SUSP labels down 3 SVG pixels in GT-R Analog; ENGINE placement unchanged.

### Added
- Separate **Blue Fog opacity 0–100%** slider, default **12%**, and retained independent Fog ON/OFF.
- Fog percentage saved in active settings and JSON profiles.

## v0.9.23 — Dashboard Warning Symbols

### Improved
- Redesigned original lightweight SVG warning symbols for TYRES, ENGINE (check engine) and SUSP (coilover/shock absorber) across both HUD styles.
- Preserved warning colors and states; fixed analog warning strokes to remain crisp instead of filling whole icon shapes.

## v0.9.22 — Severe-Crash Detection, SUSP Fix & Full-Screen Dials

### Fixed
- Changed **minimum collision speed default to 130 km/h**.
- Processes suspension-impact events on **every Car Feed update** rather than solely on periodic icon repaint, reducing missed short events.
- Added conservative **rapid full-stop detection** for severe crashes (e.g. 220→0 km/h) if `impactDv` or impact counts are missing.
- Improved discrimination of nudges and significant impacts; editable thresholds.

### Added / Changed
- **Limp Mode Repair Timer** default **30 s**; independent **No Impact Timer** default **60 s**.
- Independent Turbo/RPM/Speed X/Y positioning across the visible screen and precise pixel inputs; reset button restores the original circle offsets.
- Existing saved custom settings preserved on default migration where possible.

## v0.9.21 — Collision Threshold Tuning

### Improved
- Unified impact speed/strength gates to reduce false feedback from minor multiplayer bumps.
- Introduced adjustable collision minimum velocity-change threshold (**3.5 m/s**), Medium Impact (**8 m/s**) and Heavy Impact (**24 m/s**) defaults; SUSP warning defaults **4.5 / 9 m/s**.
- Improved handling of pre-impact speed to detect hard stops after speed drops to zero.
- This version briefly used a 60 s repair default; **v0.9.22 restored it to 30 s**.

## v0.9.20 — Impact Severity & HUD Shake Fixes

### Fixed
- Corrected overly sensitive red/Heavy Impact alerts due to shared thresholds.
- Fixed HUD Shake by animating the outer HUD container rather than a barely noticeable inner element.

### Added
- Independent Light/Medium/Heavy classification controls, collision diagnostics and adjusted visual response.

## v0.9.19 — Impact Feedback, Adjustable Speed Threshold & Menu Resize

### Added
- **Impact Feedback:** white/orange/red edge flash by severity; optional HUD-only shake, independent toggles, intensity slider and Light/Medium/Heavy preview buttons.
- **Speed Sensation start speed** adjustable **140–300 km/h**, default **190 km/h**.
- Resizable settings panel with saved size and position.

## v0.9.18 — GT-R 400 km/h Scale & Earlier Speed Sensation Curve

### Improved
- Extended analog speedometer from **360 to 400 km/h** (and to **250 mph**); corrected needle mapping without moving the dials.
- Tuned the Speed Sensation progression to be noticeably visible earlier, preserving a strong higher-speed effect: at 200/220/240/260/280/300+ km/h, representative target strengths of 0/25/45/65/85/100% (under the then-current 200 km/h threshold).
- Digital speed is not limited to 360 km/h.

## v0.9.16 — Cylindrical / Tunnel-Style Speed Sensation

### Changed
- Replaced flat left/right-only streaks with subtler radial, perspective-style streaks converging toward screen center while keeping the focal area mostly clear.
- Added independent **Blue Fog ON/OFF** toggle; default fog 12%.

## v0.9.15 — Longer Streaks & 12% Blue Fog
- Lengthened Speed Sensation streaks another 25% relative to v0.9.14.
- Raised subtle edge fog to **12%**.

## v0.9.14 — Longer Streaks & Blue Fog
- Extended streaks 50% relative to v0.9.13 and increased visibility.
- Introduced low-opacity blue peripheral fog (initially 10%).

## v0.9.13 — Performance Fix
- Removed expensive blur/shadow filters and reduced animated lines from 48 to 16 to address FPS regression.

## v0.9.12 — Realism & Strength Tuning
- Tuned Speed Sensation diagonal movement, contrast and responsiveness; default intensity set to 100%.

## v0.9.11 — Overlay Visibility & Preview
- Fixed overlay stacking/visibility and strengthened peripheral speed streaks.
- Added a **five-second Speed Sensation preview**, plus reduced-motion behavior.

## v0.9.10 — Initial Speed Sensation
- Added optional animated peripheral streaks above 200 km/h, automatically scaled by speed, with independent intensity, visibility and persisted settings.

---

## v0.9.9 — First Public Chromium Release

### Added
- Browser extension for Chrome, Edge, Brave, Opera / Opera GX and Vivaldi.
- Cross-browser local settings storage adapter, and improved profile import/export compatibility.
- Chromium extension installation structure.

### Note
- Complete live gameplay/browsers testing remained in progress.

## v0.9.8 — GT-R Analog Layout Fix

### Fixed
- Sharper warnings and label alignment for ABS/ENGINE/SUSP.
- Reduced RPM/Speed dial overlap.

### Added
- Individual X/Y dial fine positioning with original defaults.

## v0.9.7 — First GT-R Analog HUD

### Added
- Three-dial GT-R Analog HUD (Turbo / RPM / Speed), initial 360 km/h scale, MPH support, gear and warning indicators inside speed dial.

---

## Roadmap (not yet implemented)

- v1.0: **Old Style HUD**, **2000s HUD**, additional dashboards/customization.
- Drift Feedback and Rain / Water Drops effects have been removed from the active roadmap.

## Disclaimer

Unofficial and independent NFSU2.xyz community project. Game files and physics are not modified. Some warning/damage indicators and odometer values are estimated from incomplete Car Feed telemetry, and performance/accuracy vary by browser and game circumstances.
