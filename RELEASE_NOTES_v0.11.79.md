# v0.11.79 BETA — Dynamic Windshield & Interior Rain Audio

**Public Chromium desktop release · 28 November 2026.** Cumulative update since public v0.11.69. Mobile Userscript BETA 5 remains unchanged.

[Download v0.11.79](downloads/NFSU2_Modern_HUD_v0_11_79_Chromium.zip) · [Installation & upgrade](INSTALLATION.md) · [Full changelog](CHANGELOG.md)

## Dynamic Windshield Engine

- Automatic cockpit windshield contour detection adapts to the vehicle and game viewport. No per-car manual calibration is required for normal use. Tracking is experimental and may be inaccurate in some scenes or on some cars.
- Rain droplets use subtle irregular shapes, fine wet speckles and mixed sizes; they respond to speed, airflow, acceleration and braking. Optional merging and water trails, automatic refraction when a suitable canvas is available.
- Drop intensity is adjustable from 0–150% (0% disables drops; 150% adds 50% density). Size is independent (40–200%, with a +50% size shortcut). Also adjust opacity, movement, lifetime, safety margin and FPS limit.
- Existing glass reflection, dust, static wiper marks, sun strip, impact cracks and Limp Mode glass use the same cockpit mask in Latest version. Impact flash, shake and Speed Sensation remain separate.
- Choose **Latest version — Dynamic cockpit** or **Previous version — Full screen** (legacy glass effects, without dynamic droplets).
- Preserve effects on camera change: hidden rain state continues at a reduced simulation rate without drawing; crack, dust and Limp Mode timers continue. Returning to cockpit shows the remaining effects, rather than resetting them.
- Gradual, speed-dependent drying after rain stops; drying speed adjustable from 25–200%. No new drops when the rain feed is zero.
- Separate checkboxes for ordinary impact cracks and Limp Mode shattered glass. Existing damage thresholds and repair timers are retained. Dust continues to use DIRT/GRASS telemetry.
- More economical crack drawing and masking, reduced-rate background simulation and automatic tracking recovery. Actual FPS varies by machine and scene.

## Interior Rain Audio

Built-in, local stereo roof rain loop, independent of visual glass/droplet settings. No external streaming or audio import is required.

| Setting | Factory default |
|---|---|
| Enable Interior Rain Audio | On |
| Rain volume | 70% |
| Dynamic rain intensity | On |
| Cockpit view only | On |
| Smooth audio fade | On |

Playback gain is increased by 10% with output protection. Nominal fade-in is 1.35 seconds and fade-out 2.4 seconds; fast camera changes smoothly retarget the current level. The sound fades out when rain stops or the player leaves cockpit view and returns when appropriate. A 10-second preview and optional local custom sound are included. Existing saved volume choices are not intended to be overwritten by the new factory default.

Audio: **Rain Inside Car — Roof** by Nox_Sound, [Freesound #535869](https://freesound.org/people/Nox_Sound/sounds/535869/), [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Converted to Ogg Vorbis; credit is included in the extension.

## App navigation

Settings apps now use selectable sections instead of one long scrolling page. Visual Effects has separate rain, drying, reflection/dust, wiper/sun strip, damage and interior audio sections; Phone, Markers and other settings apps have section navigation. Existing My Car, Racing and communication tabs are retained.

## Quick start

1. Upgrade the existing unpacked extension in the same folder, following the [upgrade guide](INSTALLATION.md#upgrade-an-existing-installation--important-for-odo). Do not uninstall it. Export your settings and note mileage totals first; settings JSON does not contain odometer totals.
2. Disable any separate Frontvex Windshield Debug or Rain prototype extension to avoid duplicate overlays. Reload the existing Modern HUD extension and refresh the game.
3. Enter cockpit view. Open HUD Settings (Numpad + or Ctrl+Alt+M), then **Visual Effects → Windshield: General & Drying**. Enable Windshield Glass (off by factory default) and select Latest version.
4. Open **Windshield: Rain Drops**, enable Rain droplets, set intensity above zero and select **Preview rain 20 s**. If prompted, choose **Enable visual access** and share only the current game tab. The detector processes imagery locally.
5. Open **Interior Rain Audio** and select **Preview sound 10 s** to check the volume. Allow normal browser audio interaction if required.
6. For glass damage, open **Windshield: Cracks & Limp Mode**. Turn ordinary cracks off and Limp shattered glass on if you only want damage when Limp Mode activates.

## Known limitations / BETA

- Automatic cockpit identification and contour detection are heuristic, not an official cockpit or glass-mesh signal. The effect is a local overlay, not a native 3D game material; tracking may need time to acquire or recover.
- Mirror, mount and hanging-object exclusion are disabled: glass effects can overlap these objects.
- Bridge/tunnel shelter detection is not implemented. Rain feed and audio may remain active under cover.
- Direct canvas access depends on browser/game rendering; visual access may require explicit permission. No frame uploads are needed for the local detector.
- Desktop BETA only; Userscript BETA 5 remains the mobile build. Live gameplay, performance and vehicle coverage need further testing. The extension is an independent fan project, not affiliated with NFSU2.xyz.
