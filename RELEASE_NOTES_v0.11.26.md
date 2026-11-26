# NFSU2 Modern HUD v0.11.26

## New HUD Styles, Material Library, Drink and Speed Sensation Update

This release updates the Chromium desktop extension from v0.11.10 to **v0.11.26**. It is cumulative: it covers all development versions since v0.11.10.

The phone / tablet userscript has its own update, **Userscript BETA 5 (v0.11.26.5)**, now based on this v0.11.26 code — see [Userscript BETA 5 for phones and tablets](#userscript-beta-5-for-phones-and-tablets) below.

## 🏎️ Three new HUD styles

- **Honda S2000 (AP1) — Digital LED Cluster:** a large semicircular LED-bar tachometer in 100 rpm steps (the red segments flash at the redline), a 7-segment speed readout, odometer and TRIP A (with a reset button). Colors & Materials are available for this style too.
- **Honda Integra Type R (DC2) — Analog Twin Dial:** black twin dials (RPM and speed) with small TURBO and NITRO gauges at the sides, a gear display, odometer and warning lights.
- **Subaru Impreza RS — Twin Dial + Centre Display:** twin dials with a centre display that holds the gear, the NITRO bar, the odometer and the warning lights, and an analogue TURBO gauge under it.
- The Integra and the Impreza sit on the same smooth "hood" housing. Each gauge has its own position and size controls, and both have a **Speedometer scale** choice: *Game scale* (0–400 km/h, like the other analog skins) or *Real car* (0–180 km/h, the needle stops at the end of the dial).
- The **Honda S2000**, **Honda Integra Type R** and **Subaru Impreza 2.5 RS** are in the car list and get their matching HUD style automatically (you can still change the assignment per car).

## 🎨 Colors & Materials — material library

- **23 additional textures** can be chosen for the **Needle**, **Bezel (frame)** and **Dial background** of every analog HUD style (all styles except the Modern HUD):
  - Needle: Brushed Aluminum, Chrome, Matte Plastic, Red Acrylic, Blue Acrylic, Burnt Titanium, Gold Metal.
  - Bezel: Machined Aluminum, Black Anodized Aluminum, Carbon Fiber, Forged Carbon, Gunmetal, Copper, Burnt Titanium, Gold, Chrome.
  - Dial background: Matte Carbon, Alcantara, Leather, Radial Metal, Honeycomb, Piano Black, Matte Black.
- A new **Needle material** selector was added; the existing colours and materials are unchanged.

## 🍺 Drink (optional, default OFF)

- Press the Drink shortcut (default `Ctrl + Alt + B`, rebindable) to take a sip from a bottle of **beer** or **whisky**, held in a gloved hand.
- Optional police warning with consequences, a drunk look and an optional controls effect. Every part has its own switch.
- The effect never blocks the mouse and starts **OFF** for everyone.

## 🪟 Windshield glass

- Cracks now appear on **the side the car was hit** (the game sends the impact direction). If the side looks mirrored on your setup, tick **Flip left / right impact side**.
- Dust appears after driving on **dirt** and **grass**, is clearly visible, lasts 20 seconds and fades during the last 5 seconds.
- The menu shows which surface the game reports under the wheels.

## ✋ Handbrake lamp

- The lamp now follows the game's own handbrake value from the Car Feed. The `Space` key is only used as a fallback when the game does not send it.

## 🌀 Speed Sensation fix

- Streaks, Blue Fog and the corner-darkening vignette now all follow the live Car Feed. They also work when the main custom HUD is switched off (before, only the vignette did).
- All three effects switch off while the game is paused or not driving.
- A new **status line** under *Preview Speed Sensation* shows whether the effect is active and, if not, why (speed below the start speed, paused, no Car Feed, switched off…), plus the game state flags.
- The vignette help text now shows your real Start speed.

## 🛞 TYRES lamp

- The TYRES lamp now reacts only to real wheel slip (**SLIP**). The old "sudden hard brake at speed" estimate and its **ABS-style brake input** slider were removed, so ordinary braking no longer lights the lamp. **BRAKE** is only a text label (Modern HUD) while the brake pedal is pressed.
- A previously saved value of the removed slider is simply ignored.

## Userscript BETA 5 for phones and tablets

**Userscript v0.11.26.5 (BETA 5)** brings the v0.11.26 HUD to **iPhone / iPad** (Safari + Userscripts) and **Android** (Microsoft Edge + Tampermonkey). It is **one universal file** for both.

- **Included:** Honda S2000, Integra Type R and Impreza RS HUD styles, the material library, Drink, the Speed Sensation fix and the cleaned-up TYRES lamp.
- **DRINK button** in the ⚙ launcher (shown only while Drink is enabled). The Drink overlays also stay visible in fullscreen.
- **Phone defaults:** the new cluster styles start at 28 % HUD size; the other mobile defaults (Eco mode, 2 windshield cracks) are unchanged.
- **Status:** BETA 5 was tested on real phones, on both iPhone and Android, and works.

### How to install

| Device | Download | Install |
|---|---|---|
| **Android — Edge + Tampermonkey** | The **ZIP**: [Userscript BETA 5 ZIP](downloads/NFSU2_Userscripts_BETA_5.zip) (or its [direct link](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/downloads/NFSU2_Userscripts_BETA_5.zip)) | In Tampermonkey: **Dashboard → Utilities → Import from file**, choose the ZIP, then **Import**. No need to extract. |
| **iPhone / iPad — Safari + Userscripts** | The **`.js` file**: [`NFSU2_Modern_HUD.user.js`](userscript/NFSU2_Modern_HUD.user.js) (or its [direct link](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/userscript/NFSU2_Modern_HUD.user.js)) | In **Files**, **move** the file into your Userscripts folder, then open **AA → Userscripts** in Safari once. |

Full step-by-step instructions, including updating from BETA 4 (on iPhone delete the old BETA 4 file from the Userscripts folder): [Phones and tablets: Userscript BETA 5](INSTALLATION.md#phones-and-tablets-userscript-beta-5).

**[Download Userscript BETA 5 — ZIP](downloads/NFSU2_Userscripts_BETA_5.zip)** · [`.user.js`](userscript/NFSU2_Modern_HUD.user.js)

## Upgrade notes

- Download the ZIP, extract it over your existing extension folder and reload the extension. Use the same folder and browser profile to keep your settings and odometer.
- All previous settings, profiles, HUD styles and odometer data are retained.
