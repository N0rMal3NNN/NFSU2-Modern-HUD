NFSU2 MODERN HUD v0.9.31 — ODOMETER BY CAR + NUMPAD * SAVE

NEW v0.9.31:
* TYRES, ENGINE and SUSP indicators moved to the three locations marked in the screenshot (above/around the speed-dial hub).
* ODO LCD in GT-R Analog remains below gear; Modern HUD has its ODO directly below speed digits, above SHIFT.
* Open the independent Odometer — Mileage by Car menu fieldset to choose 1 of 31 vehicles. Mileage is separate for every chosen car model.
* The Numpad * key is SAVE ALL: it stores both all current HUD settings AND all car-mileage totals without opening the menu.
* 00000032.1 means 32.1 km; decimal digit represents 100 m. Maximum displayable mileage is 9,999,999.9 km.
* It starts from 0.0 km and counts only while the Car Feed shows driving; it is NOT the actual in-game car odometer.
* Automatic ODO checkpoints at each 100 m, every 30 seconds while driving (when changed), and when leaving a tab/drive session.
* HUD menu buttons: Save mileage now and Reset selected car (confirmation needed). The reset affects only the chosen vehicle. Save current settings now also saves all mileage.
* Because NFSU2.xyz's native game Save does not expose a stable public signal through Car Feed, ODO saves are independent from the native game save, and remain local to this browser/extension. Native cloud save does not include ODO.
* GT-R Analog Customization: needle color, dial numbers, tick color, numeric illumination slider and optional subtle depth.
* Default dial colors, positions, sizes and layout outside the three indicator positions remain unchanged.
* Settings menu can be resized but slider, text and swatch column stays the original max width; controls no longer stretch.
* Car ODO totals are NOT included in JSON settings profiles and are not reset when you reset HUD defaults.
* Upgrades from v0.9.27 keep the former single mileage under Previous ODO (unassigned). You can change to an actual model using the dropdown.
* The selected model is manual, not read from the game. Two owned cars of the same model share one mileage counter; separate same-model copies are not tracked.
* Switching models takes effect immediately and resets the time integration so no distance is counted for the wrong car.
* Other features (Impact, Speed Sensation, Fog, 400 km/h, collision balance, Limp Mode) are unchanged.

OLDER UPDATE (v0.9.24): TYRES wheel icon restored from old Modern HUD on both Modern and GT-R Analog. Analog TYRES and SUSP labels lowered 3px (ENGINE unchanged). Blue Fog opacity slider 0–100%, default 12% with separate Enable Blue Fog switch. All settings autosave and export/import with JSON profiles.

CURRENT UPDATE — v0.9.31 (NOVEMBER 20, 2026)
- Minimum collision speed: 130 km/h (manual adjustment remains available).
- Severe collision fallback also detects 220 -> 0 km/h hard stop without impactDv or a counter increment. This is inferred telemetry, not an in-game physics modification.
- SUSP warnings now capture impacts/landings on every Car Feed update even between slower HUD refreshes.
- Separate defaults: LIMP MODE Repair Timer = 30 seconds; No Impact Timer = 60 seconds.
- GT-R Analog circles (Turbo/RPM/Speed) can move across the whole display with X/Y sliders and precise numeric entries. Default circle positions/size/design do NOT change.
- Auto-save and JSON profiles retain the new positions; Reset Analog Circle Positions button restores the original offsets.
- All previous visual effects, analog 400 km/h, blue fog and controls are retained.

OLDER CHANGELOG NOTES BELOW (historical settings may be different):
HISTORICAL UPDATE v0.9.21 — COLLISION BALANCE + 60s LIMP MODE
- Default collision minimum 150 km/h and 3.5 m/s impact velocity change.
- Shared filter for Impact Flash, SUSP icon and simulated engine damage.
- LIMP MODE repair default 60 seconds; customized non-default values preserved on upgrade.
- Slighter nudges from other players no longer cause instant warnings.

HISTORICAL FIX v0.9.20 — IMPACT SEVERITY CALIBRATION
- Red (Heavy) flashes were triggered too easily by the old 5.5 m/s threshold.
- New default thresholds: Light < 6.0 m/s, Medium 6.0–23.9 m/s, Heavy >= 24.0 m/s (instant collision velocity change, not driving speed).
- Medium and Heavy threshold sliders in Visual Effects -> Impact Feedback.
- Last collision shows the reported m/s and classified severity, for in-game calibration.
- Impact thresholds are independent of the SUSP/BUMP telemetry settings.
- Both sliders are saved and included in JSON profile export/import.
- HUD Shake FIX: transform animation on HUD container (visible amplitude) while preserving HUD scale/position.
- HUD Shake / Flash / intensity, Speed Sensation, Blue Fog, resizable menu and 400 KM/H analog dial are preserved.

NFSU2 MODERN HUD v0.9.31 - FIREFOX (GECKO)

HISTORICAL UPDATE v0.9.19 — IMPACT FEEDBACK + RESIZABLE MENU
- Speed Sensation starts ABOVE 190 km/h by default. Choose 140–300 km/h in 5 km/h steps in the settings menu. All thresholds are in km/h, even with MPH display.
- The speed intensity curve shifts with the selected starting speed and preserves the already tuned full-strength high-speed look.
- Settings menu is now RESIZABLE: drag the bottom-left corner ↙ to change width and height. Drag the header to move the window. Both position and size are stored locally and exported in profiles.
- Impact Feedback: optional flash and tiny HUD-only shake at 70% intensity by default. Three collision levels (light ~0.15s, medium ~0.25s, heavy ~0.4s). The preview buttons let you test each one without crashing.
- Impact Feedback uses read-only events.impacts and impactDv; the game does not provide precise contact direction or damage. Landings are not treated as collisions. Separate from the optional Damage System.
- Blue Fog 12% toggle and 100% default Speed Sensation intensity remain unchanged.
- Old GT-R Analog 400 KM/H / 250 MPH and Modern Digital HUD logic preserved.

EARLIER VERSION NOTES BELOW (HISTORICAL; CURRENT DEFAULT SPEED START IS 190 KM/H):

==========================================

This is the Firefox desktop version (Firefox 140+). The HUD remains
functionally equivalent to Chromium: Modern HUD and GT-R Analog, fine
dial positioning, RPM/gear/speed, shift lights and local JSON profiles.

FIREFOX TEMPORARY INSTALL (DEVELOPMENT / TESTING)
1. Unzip the Firefox build.
2. Open Firefox and type: about:debugging#/runtime/this-firefox
3. Click "Load Temporary Add-on..." and choose the manifest.json file
   inside the NFSU2-HUD-Firefox folder. You can also select a packaged ZIP.
4. Open / reload https://nfsu2.xyz
5. Press NUMPAD + to open the in-game settings; NUMPAD - toggles HUD.

IMPORTANT
- Firefox temporary add-ons do not survive a Firefox restart.
- For permanent distribution a signed Firefox .xpi is required, normally
  through Mozilla Add-ons (AMO), or approved signing for self-distribution.
- Firefox extension settings are stored separately from Chrome / Edge / etc.
  Export JSON from one browser and import it in another to transfer settings.
- Stable Gecko ID has been added so future Firefox builds can retain local
  storage when installed as updates with the same ID.
- This is an UN-SIGNED development ZIP, not a permanent Firefox installation.

NOTICE
Unofficial community-created overlay for NFSU2.xyz; no endorsement.
Browser visuals depend on the game's exposed Car Feed data; experimental
telemetry warnings and simulated damage do not change game physics.
No remote data collection or analytics.

SPEED SENSATION (NEW):
- Се вклучува над 200 km/h (исто и кога брзината се прикажува во MPH).
- Дискретни анимирани линии покрај левиот и десниот раб на екранот; посилни со брзината.
- Нема вистински camera/game motion blur и не ја менува физиката.
- Numpad + -> Visual Effects -> Speed Sensation ON/OFF и Intensity 0–100%.
- Стандардно ON, 50%; под 200 km/h, надвор од возење и на скриен таб ефектот запре.
- Settings и JSON профили го паметат изборот.

SPEED SENSATION REALISM UPDATE v0.9.14:
- Поправен слојот за прикажување над играта; линиите се повидливи при висока брзина.
- На 200 km/h ефектот е исклучен; над 200 почнува.
- Копче Preview Speed Sensation (5 seconds) во HUD Settings за проверка без возење.
- Reduced Motion: статични линии наместо целосно сокривање.
- Интензитетот и профилите остануваат зачувани.

SPEED FX FPS FIX v0.9.14: 8 streaks per edge (was 24); removed blur, filters, shadows, and frequent CSS animation variable writes.

SPEED SENSATION TUNING v0.9.14:
- Same 8 lines per side, now exactly 50% longer than v0.9.13.
- Their internal gradient alpha increased 10% (relative to v0.9.13).
- Static blue tint along both screen edges, maximum 10% alpha, between the lines.
- No CSS blur, shadows or additional animated elements. No full-screen darkening.
- The effect remains off through 200 km/h and retains saved intensity/preview.

SPEED SENSATION TUNING v0.9.17:
- Speed streaks are 25% longer than v0.9.14; cumulative 87.5% longer than v0.9.13.
- Side blue fog maximum alpha is now 12% (previously 10%).
- No additional animated elements; keep the 16-streak FPS-friendly render.

GT-R ANALOG (previous setup):
- Speedometer scale 0-400 KM/H (or 0-250 MPH); needle mapping corrected to use same max.
- Default dial dimensions and positions, RPM/Turbo circles and warnings are preserved.
- Modern Digital speed has no fixed 360 KM/H cap.
- Changes affect visual gauges only, never the actual game speed or physics.

NEW v0.9.31: Per-car mileage autosaves on every FULL 100 m. The chosen vehicle and mileage are restored after closing/reopening the browser. Menu and HUD display exactly the same rounded-DOWN tenths (e.g., 4.89 km shows 4.8 km in both). A V3 storage record is retained alongside a compatible V2 copy. Keep the same extension folder to preserve Chrome/Edge local storage.
