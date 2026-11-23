# NFSU2 Modern HUD — Installation & Update Guide

**Release: v0.10.7 — Chromium-based desktop browsers**

Unofficial NFSU2.xyz community browser HUD. The release ZIP contains one **`NFSU2-HUD-Chromium/`** folder for supported Chromium-based desktop browsers.

**Downloads:** [Download Latest](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/downloads/NFSU2_Modern_HUD_LATEST_Chromium.zip) · [Choose Version](DOWNLOADS.md). GitHub's green **Code → Download ZIP** button downloads the entire source repository, not the latest extension package.

## Supported desktop browsers

Google Chrome, Microsoft Edge, Brave, Opera / Opera GX, Vivaldi, and other compatible Chromium-based desktop browsers.

## Fresh installation — Chromium family

1. Download the latest Chromium ZIP using the link above and extract it to a **permanent folder**.
2. Open `chrome://extensions`, `edge://extensions`, or your browser's extension manager.
3. Turn on **Developer mode** and choose **Load unpacked**.
4. Select the **`NFSU2-HUD-Chromium`** folder containing `manifest.json`, not the parent folder.
5. Open or refresh `https://nfsu2.xyz`.
6. Press `Numpad +` (or `Ctrl + Alt + M`) to open HUD Settings. Enable the dashboard(s) you want.
7. In **Odometer — Mileage by Car**, manually choose your current car model. Mileage starts at 0 for models without saved distance.

## Upgrade an existing installation — important for ODO

**Do not uninstall the old extension, wipe its storage, or install the new ZIP from a different unpacked path** if you want its local settings/odometer to remain attached to the same extension identity.

1. Open settings, **export settings JSON**, and separately note any mileage totals that matter to you: ODO totals are **not contained in JSON exports**.
2. Stop driving and close the NFSU2.xyz game tab.
3. Unzip the latest release to a temporary directory.
4. Copy the updated files from `NFSU2-HUD-Chromium` **over the existing files in the previously installed extension folder**. Keep the same folder path.
5. Open your browser extension manager and press **Reload** on the existing extension; then refresh the game.
6. Verify that settings, car selection and local ODO values are still present. Use the SAVE ALL shortcut (`Numpad *` by default) once checked.

A different extension ID may not have access to the previous extension's locally saved mileage. The game's own save does not include these values.

## Useful shortcuts

| Default | Function |
|---|---|
| `Numpad +` | Open / close HUD Settings (rebindable) |
| `Ctrl + Alt + M` | Fallback menu shortcut |
| `Numpad -` | Main custom speedometer ON/OFF (rebindable) |
| `Numpad *` | SAVE ALL settings and local ODO (rebindable) |
| `Ctrl + Alt + N` / `Numpad /` | Independent Status HUD ON/OFF |

Use the keyboard-shortcuts editor for **TKL / laptop** keyboards. The **Handbrake lamp** uses `Space` while driving, independently of the three customizable menu/HUD/save shortcuts. Its light is based on the key press, **not** Car Feed handbrake telemetry.

## HUD, effects and new options

- **HUD Style:** Modern, GT-R Analog, Corolla, Civic, RX-7, Audi A3/TT, Nissan 350Z/G35, Evo VIII/STi, Supra/RX-8. Variant/visual choices depend on the selected style.
- **Colors & Materials:** per-analog-style needle, dial, ODO and frame colors/materials. Modern HUD has separate digital colors.
- **Glass:** adjustable reflection/visual-depth overlay for analog dashboards.
- **Standalone Status HUD:** independent warning indicators, layout, X/Y, scale, opacity and colors.
- **Pedals HUD:** independent Throttle/Brake bars; choose Independent / Under Speedometer / Inside Standalone, plus layout, position and colors.
- **Impact feedback:** HUD Shake and impact settings, including optional override for Reduce Motion and Last Collision diagnostics.
- **Speed Sensation:** optional streaks, Blue Fog and corner-darkening Vignette settings.
- **Limp Mode:** optional local input restriction. It can run and display while the main custom speedometer is hidden.

## Odometer

- A local estimate of distance derived from car speed and elapsed time, stored **per selected car model**.
- Manually choose the car; the extension does not directly identify your active model through Car Feed.
- Tenths of a kilometre are shown (`00000032.1` = 32.1 km). Autosave checkpoints occur each 100 m, plus additional saves.
- Maximum 9,999,999.9 km. Reset affects only your selected model, with confirmation.
- Settings JSON export/import **does not carry mileage**.

## Troubleshooting

**No HUD:** ensure the correct folder is loaded, reload the browser extension, refresh the game, toggle the relevant main or standalone HUD ON.

**Missing mileage after update:** check whether the extension ID/folder or browser profile changed. Reinstalling a fresh extension does not automatically import local storage from an old extension ID.

**Numpad not present:** use `Ctrl + Alt + M` for settings and rebind Menu, HUD Toggle and SAVE ALL from Settings or the extension popup.

**Shake doesn't appear:** check minimum collision thresholds, impact/shake toggle and Windows/browser Reduce Motion setting; the Last Collision diagnostic can show a reason. Disable the Reduce Motion override if you prefer reduced animation.

**FPS lower than expected:** reduce HUD update rate or disable/reduce Glass, Speed Sensation, Vignette and Impact Feedback. Compare under the same scene and graphics conditions.

## Notice

This is an independent, unofficial visual extension. Car Feed data can be missing or stale and some indicators are estimated. It does not modify native car physics or the game's files.