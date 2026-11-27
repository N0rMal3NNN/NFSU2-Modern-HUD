# v0.11.58 BETA — Frontvex Phone, GPS & Automatic Speedometer (PC)

Cumulative desktop update since the previous public v0.11.26 release. The public desktop build and source are available in the main branch. [Download v0.11.58](downloads/NFSU2_Modern_HUD_v0_11_58_Chromium.zip).

## Frontvex in-game phone
- A new phone-based settings menu with a classic panel alternative, home screen, search, app navigation and back/forward controls.
- Customizable phone size, position, design, frame, body, bezel and accent colors, materials, case, screen cutout, glare and opening animation.
- Optional 3D phone with a 360-degree rotation mode, rear triple camera, flash, Frontvex logo, beveled side buttons and USB-C port detail. Optional sunlight effect and corner placement.
- Clock, calendar, game weather, wallpaper, markers, driving settings, status HUD, profiles, shortcuts, Contacts and Messages apps; Settings, Cars HUD, Colors and Effects shortcuts.
- Wallpaper presets and your own image; fit and dimming controls; customizable icon and weather card sizes.
- Phone concept inspiration: **[OBD Gaming](https://www.facebook.com/overbudgetgg)**. This is a credit for the idea, not a statement of affiliation or endorsement.

## Game telemetry and GPS
- New Car Feed identity fields: automatically choose a speedometer by vehicle model, or turn Automatic OFF and save a different HUD style for each owned Car ID (garage slot). The previous manual assignments are retained when automatic mode is enabled. Stock cars without a stable ID use the model fallback. Mileage continues to be stored per model.
- Pin Markers with city labels, saved positions and speed recording. Received GPS pins are grouped by location and can be saved explicitly; duplicate Save Pin controls removed. Imported pins can record the recipient's own speed.
- Game weather via the read-only View Feed, with rain, clouds, road conditions, sun and game time. Refresh when opening the phone or manually; waits for real feed data and times out gracefully. City is selected manually, not automatically detected.

## Frontvex communication — limited server beta
- Local profiles with username and FVX number; signed server reservation and official human verification. A cryptographic public FVX ID identifies the account. Standard numbers expire after 15 days without renewal.
- Contacts, friend requests, accepted friends, online/offline presence, local blocking, private direct WebRTC messages, pending delivery, delivery/read receipts and manually shared GPS pins.
- Inbox with latest message, sender, timestamp and unread count; incoming/outgoing chat bubbles, chronological history and centralized local message deletion with selection and confirmation. Configurable history limit.
- Friend request, new message, shared pin and Friend Online alerts, sound selection (five tones), adjustable volume, test alerts, message preview, Do Not Disturb and persistent unread badges. Notifications use a phone banner or bottom-right toast; Frontvex popup duration increased from 3 to 4 seconds, GPS marker and HUD save toasts also extended by one second.
- More reliable presence, reconnect, identity renewal, incoming notification deduplication and message queue processing; WebRTC is direct/STUN-only, so delivery depends on network compatibility. Usernames, contacts, message history and private keys are local, not stored centrally.
- **v0.11.57: Embedded registration fix.** The official Turnstile page uses a credentialless iframe on supported Chromium browsers; the authorization server permits the NFSU2 game origins. In-game verification was confirmed by the project owner without opening a new tab or reloading the game.
- **v0.11.58: Automatic connection after registration.** Successful registration or re-registration triggers a connection refresh without requiring Reconnect / Renew. Routine renewals do not interrupt an active connection, and a deliberately disabled communication setting remains disabled. The code and simulated tests passed; the complete v0.11.58 live registration/reconnection flow still needs confirmation.
- Online functionality requires an enabled, reachable Frontvex server and is still a controlled beta. The desktop HUD does not require registration. Public availability of the communication service is not guaranteed; no administrative interface is included.

## Usability, reliability and compatibility
- Long help explanations moved into circled ! popups, with compact inline icons, merged related descriptions, Close/Escape/outside-click dismissal and searchable help text. Important warnings and live status remain visible.
- Storage adapter handles invalidated extension contexts and stops endless retries; bounded retries for temporary save failures. Reload the game after updating the extension. Existing settings and odometer keys retained.
- Desktop Chromium only for this update. The new mobile userscript is not ready; the previous Userscript BETA 5 (v0.11.26.5) remains available for iPhone and Android.
- Unofficial fan project; uses read-only game feeds for telemetry. Some displayed driving effects and warnings are estimates or simulations. Existing optional keyboard-driven effects remain separate from telemetry.

## Upgrade
Replace files in the same unpacked extension folder, reload the extension, then reload NFSU2.xyz. Do not uninstall or switch browser profiles if you want to preserve your local settings, mileage and Frontvex identity.

See [Downloads](DOWNLOADS.md) and [Installation](INSTALLATION.md).
