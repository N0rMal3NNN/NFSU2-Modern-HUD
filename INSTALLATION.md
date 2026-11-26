# NFSU2 Modern HUD — Installation & Update Guide

**Release: v0.11.26 — Chromium-based desktop browsers · Userscript BETA 4 for phones and tablets (based on v0.11.10)**

Unofficial NFSU2.xyz community browser HUD. The release ZIP contains one **`NFSU2-HUD-Chromium/`** folder for supported Chromium-based desktop browsers.

**Downloads:** [Download Latest](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/downloads/NFSU2_Modern_HUD_LATEST_Chromium.zip) · [Choose Version](DOWNLOADS.md). GitHub's green **Code → Download ZIP** button downloads the entire source repository, not the latest extension package.

## Supported desktop browsers

Google Chrome, Microsoft Edge, Brave, Opera / Opera GX, Vivaldi, and other compatible Chromium-based desktop browsers.

For phones and tablets (iPhone: Safari + Userscripts; Android: Edge + Tampermonkey), jump to [Phones and tablets: Userscript BETA 4](#phones-and-tablets-userscript-beta-4).

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

## HUD position — v0.11.10

In the main HUD settings, **HUD X Position** and **HUD Y Position** move the entire speedometer relative to its selected corner (sliders ±1000 px or precise pixel fields). Negative X moves left, negative Y moves up. Every HUD style remembers its own position; **Reset HUD X/Y Position** returns the current style to 0/0. The values are saved with SAVE ALL and the settings JSON.

## Useful shortcuts

| Default | Function |
|---|---|
| `Numpad +` | Open / close HUD Settings (rebindable) |
| `Ctrl + Alt + M` | Fallback menu shortcut |
| `Numpad -` | Main custom speedometer ON/OFF (rebindable) |
| `Numpad *` | SAVE ALL settings and local ODO (rebindable) |
| `Ctrl + Alt + N` / `Numpad /` | Independent Status HUD ON/OFF |

Use the keyboard-shortcuts editor for **TKL / laptop** keyboards. The **Handbrake lamp** follows the game's own handbrake value from the Car Feed; `Space` is only used as a fallback when the game does not send it. The **Drink** shortcut (default `Ctrl + Alt + B`) is rebindable in the menu.

## HUD, effects and new options

- **HUD Style:** Modern, GT-R Analog, Corolla, Civic, RX-7, Audi A3/TT, Nissan 350Z/G35, Evo VIII/STi, Supra/RX-8, Honda S2000 (digital LED), Honda Integra Type R, Subaru Impreza RS. Variant/visual choices depend on the selected style.
- **Colors & Materials:** per-analog-style needle, dial, ODO and frame colors/materials, plus a library of 23 extra needle, bezel and dial-background textures (not for the Modern HUD). Modern HUD has separate digital colors.
- **Glass:** adjustable reflection/visual-depth overlay for analog dashboards.
- **Standalone Status HUD:** independent warning indicators, layout, X/Y, scale, opacity and colors.
- **Pedals HUD:** independent Throttle/Brake bars; choose Independent / Under Speedometer / Inside Standalone, plus layout, position and colors.
- **Impact feedback:** HUD Shake and impact settings, including optional override for Reduce Motion and Last Collision diagnostics.
- **Speed Sensation:** optional streaks, Blue Fog and corner-darkening Vignette settings. All three follow the live Car Feed, also work with the main HUD off, and a status line in the menu shows whether the effect is active and why not.
- **Limp Mode:** optional local input restriction. It can run and display while the main custom speedometer is hidden.

## Cockpit overlays — v0.11.7 and later

After installation, open the HUD Settings (default `Numpad +` or `Ctrl + Alt + M`). The optional effects are grouped under **Visual Effects**.

- **Cigarette:** enable it, then choose bottom-left/center/right position, size (50–150%), Smoke animation ON/OFF, smoke amount, Ember puff, Smoke leans with speed, and whether it appears in front of the HUD. **Preview cigarette** works without driving.
- **Helmet View:** enable it and choose **GT Full-Face** or **Open-Face Sport**. Change opacity, opening size (90–130%), placement in front of/behind the HUD, impact shake ON/OFF and intensity. **Preview shake** demonstrates the effect.
- **Windshield Glass:** independent effects for reflection, dust, wiper marks, a custom-color sun strip, impact cracks, Limp shattered glass and central visibility protection. Since v0.11.8 the cracks use their own impact threshold (*Crack on impacts from*, default 3.0 m/s, range 3–20 m/s).
- **Drink:** enable it, pick beer or whisky, and press the Drink shortcut to take a sip. Optional police warning, drunk look and controls effect.
- **TYRES indicator:** the activation threshold is the `Wheel slip warning` slider × **1.155**. The slider remains adjustable. Since v0.11.26 the lamp reacts only to real wheel slip; the old sudden-brake estimate was removed and BRAKE is only a text label.

The cigarette, helmet, windshield and Drink effects start **OFF** for new installations. Existing saved settings are preserved when upgrading. They require a live Car Feed to display during driving and do not modify the game's car physics.

## Phones and tablets: Userscript BETA 4

The userscript runs the same v0.11.10 HUD on touch devices. It is a **BETA** (v0.11.10.4).

| Device | Browser + userscript manager | Status |
|---|---|---|
| iPhone / iPad | **Safari + Userscripts** | Working — tested by the project owner |
| Android | **Microsoft Edge + Tampermonkey** | Working — tested by the project owner and by **RacerXC**, the first Android beta tester |
| Other Android browsers / managers | — | Not tested |

**Download:** [Userscript BETA 4 ZIP](downloads/NFSU2_Userscripts_BETA_4.zip) (contains `NFSU2_Modern_HUD_v0_11_10_US_BETA_4.user.js`) or the raw file [`userscript/NFSU2_Modern_HUD.user.js`](userscript/NFSU2_Modern_HUD.user.js). Extract the ZIP first; the manager needs the `.user.js` file, not the ZIP.

### iPhone / iPad — Safari + Userscripts

An iPhone needs the **Userscripts** app and the **Safari** browser. Userscripts is a Safari extension, so other browsers on iOS do not run it. The Userscripts project lists iOS 15.1 or later as the minimum version.

1. Install **Userscripts** from the App Store and open the app once.
2. Open **Settings → Safari → Extensions → Userscripts** and turn it **ON**. Set the permission to **Allow** (the Userscripts project recommends *Always Allow* for *All Websites*; at least allow `nfsu2.xyz`). You can also open this from Safari with the **AA** button in the address bar.
3. Userscripts keeps its scripts in a folder. Current versions create a default folder automatically; if the app asks, tap **Set Userscripts Directory** and choose a folder.
4. Put the script into that folder: download and extract the BETA 4 ZIP, then copy `NFSU2_Modern_HUD_v0_11_10_US_BETA_4.user.js` into the Userscripts folder with the **Files** app.
   - *Alternative (from the Userscripts documentation):* open the raw `.user.js` link `https://raw.githubusercontent.com/N0rMal3NNN/NFSU2-Modern-HUD/main/userscript/NFSU2_Modern_HUD.user.js` in Safari, tap **AA → Userscripts** and confirm the install prompt. This path was not tested with this script.
5. Open **`https://nfsu2.xyz`** in **Safari**. Tap **AA → Userscripts** to check that the script is listed and active (version `0.11.10.4`). A small **⚙** button appears in the top-left corner. If it does not, reload the page.

### Android — Microsoft Edge + Tampermonkey

1. **Install Microsoft Edge** from Google Play.
2. **Install Tampermonkey:** open Edge, open the browser menu, choose **Extensions**, search for **Tampermonkey** by Jan Biniok and install it. Make sure **Enable** and **Allow User Scripts** are turned **ON**.
3. **WebGPU (only if required):** if the game fails to start with a WebGPU error, open `edge://flags/#enable-unsafe-webgpu`, set **Unsafe WebGPU Support** to **Enabled** and restart Edge. ⚠️ This is an experimental browser setting that may affect security and stability. Enable it only if it is necessary.
4. **Install Modern HUD:** download and extract the BETA 4 ZIP, open the **Tampermonkey Dashboard**, go to **Utilities → Import from file**, select the `.user.js` file and install it. Check that the installed version is **0.11.10.4**.
5. Open **`https://nfsu2.xyz`**, enter Free Roam or start a race and use the floating **⚙** button to open the HUD settings. Adjust the HUD size and X/Y positions so that the HUD does not overlap the mobile driving controls.

### Using the ⚙ button

- **Tap** it to show three buttons: **HUD** (settings), **ON/OFF** (speedometer) and **SAVE** (settings + odometer). Tap the ⚙ again, or tap anywhere else, to hide them.
- **Drag** it with your finger to move it. Its position is remembered **separately for Portrait and Landscape**.
- **HUD** opens the touch-friendly settings menu; close it with ×. The ⚙ is hidden while the menu is open.
- The ⚙ stays available when the speedometer is OFF, so you can turn it back on.

### Good to know

- The custom HUD appears only during active gameplay (Free Roam or a race), when the game is sending the Car Feed.
- The userscript keeps its **own settings and odometer** in the userscript manager's storage. They are **not shared** with the desktop extension and do not sync between devices.
- The mobile defaults use smaller HUD sizes, *Eco* performance mode and at most **2 windshield cracks on screen** (*Windshield Glass → Max cracks on screen*: 2, 3, 4 or Standard); adjust them in Settings.
- Cigarette, Helmet View and Windshield Glass start **OFF**; they can reduce FPS on weaker phones.
- Keyboard shortcuts are for desktop; on a phone use the ⚙ button.
- To update, import or copy the newer `.user.js` over the old one in your userscript manager.

### Problems? Use the Debug report

Open the HUD settings and find **Android / Car Feed Debug**. It shows a local-only diagnostic report (script manager, Car Feed requests and packets, whether the car is detected and driving, and the last error). No data is sent anywhere. Drive in Free Roam or a race first, then use **Copy Debug Report** and send the report with your phone model, OS/browser version and Tampermonkey/Userscripts version. **Reconnect Car Feed** asks the game for the feed again.

**No ⚙ button:** make sure the userscript manager is enabled for `nfsu2.xyz`, the script is turned on and the page was reloaded. The ⚙ appears only on touch devices.

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
