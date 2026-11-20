# NFSU2 Modern HUD — Installation & Update Guide

**Release: v0.9.31 — Chromium + Firefox**

NFSU2 Modern HUD is an unofficial browser extension for [NFSU2.xyz](https://nfsu2.xyz).

## Supported desktop browsers

Google Chrome, Microsoft Edge, Brave, Opera/Opera GX, Vivaldi, compatible Chromium browsers (including Arc where extension loading is available), and Mozilla Firefox 140+.

The release ZIP includes separate folders for Chromium (`NFSU2-HUD-Chromium`) and Firefox (`NFSU2-HUD-Firefox`). **Do not load both folders in the same browser.**

## First installation — Chrome / Edge / Brave / Opera / Chromium

1. Download the latest extension ZIP from [Releases](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/releases).
2. Extract the archive to a **permanent** folder that you will keep for future updates.
3. Open your browser's extension manager (for example `chrome://extensions` or `edge://extensions`).
4. Turn on **Developer mode**.
5. Select **Load unpacked** and choose the **`NFSU2-HUD-Chromium`** folder containing `manifest.json`.
6. Open or refresh `https://nfsu2.xyz/` and press **Numpad +** to open the settings.
7. Under **Odometer — Mileage by Car**, manually choose the model you currently drive. Mileage starts at zero for models without saved distance.

## Upgrade an existing installation (important for mileage)

**Do not remove the extension, clear extension storage or install the updated version from a new directory.** For Chrome-family unpacked extensions, this can change its extension identity and separate it from its existing settings and mileage.

1. Open HUD Settings and **export your settings profile** as a backup. Note the current mileage for any cars you care about; profile JSON does **not** include mileage.
2. Close or stop the game tab and your driving session.
3. Extract the new v0.9.31 ZIP to a temporary location.
4. **Copy the updated files from `NFSU2-HUD-Chromium` into the exact previously installed `NFSU2-HUD-Chromium` directory**, replacing the old files in place. Keep the folder path unchanged.
5. Open the extension manager and press **Reload** on the existing extension.
6. Refresh the NFSU2.xyz game page. Check that your previous settings, selected car and mileage return.
7. Press **Numpad `*`** to save all settings and odometer totals after checking.

If a different extension ID was assigned previously, a new install cannot automatically read mileage stored by the old ID. The ODO is not part of the native game's cloud save.

## Firefox

1. Extract the release ZIP.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select `manifest.json` inside `NFSU2-HUD-Firefox`.
4. Open NFSU2.xyz and press **Numpad +**.

**Firefox temporary add-ons are removed when Firefox restarts**. Re-adding one is not equivalent to a stable, signed installation and may not preserve extension-local mileage across sessions. A Mozilla-signed installation is needed for stable permanent distribution. Export settings and keep independent mileage notes if testing in Firefox temporarily.

## Keyboard shortcuts

| Key | Action |
|---|---|
| Numpad + | Open/close Settings |
| Numpad − | Enable/disable the custom HUD |
| Numpad `*` | Save **all current settings and odometer data** without opening Settings |

## Odometer guide

- Choose one of **31 car models** manually in **Odometer — Mileage by Car**.
- Mileage is separate **per model**, not per physical vehicle/save slot.
- Display format includes tenths of a kilometre: `00000032.1` = 32.1 km; each decimal step equals 100 m.
- Automatically saved each **100 m** plus periodic saves while driving and on exit; local extension storage only.
- Max `9,999,999.9 km`. A reset erases only the selected car's mileage after confirmation.
- **Numpad `*`**, **Save mileage now**, and **Save current settings now** offer manual saving.
- Profile JSON exports/imports include HUD customization **but not** per-car mileage.

## Troubleshooting

**HUD does not appear:** Reload the extension, refresh NFSU2.xyz, and press Numpad − to ensure the custom HUD isn't disabled. Check that the `manifest.json` from the correct browser folder is installed.

**Mileage starts from zero or changes car unexpectedly:** Check that the previous extension identity and folder were kept, and confirm the manually selected vehicle in the Odometer section. Browser profiles/installations have separate storage.

**Numpad `*` shows a saving error:** Open the settings and try **Save current settings now**. If browser extension storage fails, check browser storage permissions and whether the extension is active. Do not assume the game save stores your ODO.

**Collision/warning effects feel incorrect:** Tune collision thresholds in Settings. Severity and impact signals are estimated from available Car Feed data and are not guaranteed mechanical measurements.

**Lower FPS with visual effects:** Disable Speed Sensation or Impact Feedback or select a lower HUD update rate; benchmark on the same track, with the same browser settings.

## Important notice

Unofficial fan-made visual overlay. No original NFSU2.xyz game files are altered. Certain telemetry alerts and impact indications rely on estimates; compatibility and performance can vary among browsers.