# v0.11.58 BETA — Frontvex Phone, GPS & Automatic Speedometer (PC)

A major desktop update that brings a customizable smartphone interface into NFSU2.xyz, combining dashboard customization, game telemetry, driving tools and optional player communication in one place.

## Frontvex Phone — 2D & 3D

- **Phone interface:** a home screen with app icons, clock, calendar, search and back/forward navigation. The classic HUD settings panel remains available as an alternative.
- **3D design:** rotate the phone through 360° to view its front, sides and rear, with a triple-camera design, flash, Frontvex logo, physical button details and USB-C port.
- **Appearance:** customize the frame, body, bezel, accent colors, materials, case, screen cutout, glare and opening animation. Optional sunlight effect.
- **Size and placement:** adjust the phone scale and choose its screen position, including corner and centered layouts.
- **Wallpaper:** select a preset or use your own image, with image-fit and dimming controls. Adjust app icon and weather card sizes.
- **Apps and shortcuts:** access Settings, Cars HUD, Colors & Materials, Effects, Driving, Status HUD, Profiles, Shortcuts, Markers, Weather, Contacts and Messages directly from the phone.

Phone concept inspiration: **[OBD Gaming](https://www.facebook.com/overbudgetgg)**.

## Automatic Speedometer & Car Profiles

- **Automatic ON:** selects a matching dashboard style using the vehicle model reported by the game's Car Feed.
- **Automatic OFF:** choose a HUD style manually for each owned car using its unique Car ID. Different cars of the same model can have different dashboard styles.
- **Personal assignments:** switching between automatic and manual mode retains your saved manual choices. Cars without a stable Car ID use the model-based fallback.
- **Odometer:** mileage continues to be recorded separately for each vehicle model.

## Game Weather & Time

- Displays the in-game time and weather conditions using the read-only View Feed.
- Shows rain, cloud conditions, road conditions and sunlight information when available.
- Weather information refreshes when opening the phone and can also be refreshed manually.
- Select a city label manually; the feature does not use real-world GPS or automatically identify your city.

## GPS & Pin Markers

- Save locations in the game world as personal markers and organize them with city labels.
- Record your driving speed at saved marker locations.
- Share a selected GPS pin with a Frontvex friend and save received pins to your own marker collection.
- Use received markers to record your own speed at the same location. Nearby received pins are grouped by location.

## Frontvex Contacts & Player Communication (Limited Server BETA)

- **My Profile:** choose a local username and reserve a custom FVX phone number. Each account uses a cryptographic FVX identity.
- **Friends:** send and accept friend requests, view your contacts and see online/offline presence. Local blocking is available.
- **Private messages:** direct peer-to-peer WebRTC communication, pending delivery, delivery/read receipts and manually shared GPS pins.
- **Inbox:** see the sender, latest message, timestamp and unread count. Conversations use separate incoming and outgoing message bubbles.
- **Message history:** configurable local history limit and centralized deletion controls with selection and confirmation.
- **Connection management:** automatic connection refresh after successful registration or re-registration, manual Reconnect / Renew, and an independent communication enable/disable setting. Ordinary renewal is designed to preserve an active connection.

## Notifications & Sounds

- Alerts for friend requests, incoming messages, shared GPS pins and friends coming online.
- Five selectable notification sounds, adjustable volume and test alerts.
- Optional message previews, Do Not Disturb and persistent unread badges.
- Notifications appear as a phone banner or a bottom-right toast; Frontvex popup notifications have a four-second display duration.

## Registration & Privacy

- Official Cloudflare Turnstile verification opens in a popup over the game on supported Chromium browsers, without opening a new tab or navigating away from the game.
- Standard FVX number reservations expire after 15 days without successful renewal.
- Usernames, private keys, contacts and message history are stored locally. The registration service stores the information required for number reservation and account authentication.
- Direct WebRTC communication depends on network compatibility; there is no central message history or relay service.
- Frontvex communication is optional and currently operates in a restricted server BETA. Access is not guaranteed for every user. The HUD, customization and local driving features do not require an FVX account.

## Settings & Everyday Use

- Compact help icons provide contextual explanations without filling the settings menu with long descriptions.
- Search includes help text; important warnings and live status remain visible.
- Local HUD profiles, saved settings and per-model odometer records remain available when upgrading in the same extension folder and browser profile.


[Download v0.11.58](downloads/NFSU2_Modern_HUD_v0_11_58_Chromium.zip)

## Availability

Desktop Chromium release. Mobile remains on Userscript BETA 5 (v0.11.26.5) for iPhone and Android. This is an unofficial fan project; some driving warnings and effects are estimates or simulations based on game telemetry. The full automatic reconnection flow remains subject to live beta testing.

## Upgrade
Replace files in the same unpacked extension folder, reload the extension, then reload NFSU2.xyz. Do not uninstall or switch browser profiles if you want to preserve your local settings, mileage and Frontvex identity.

See [Downloads](DOWNLOADS.md) and [Installation](INSTALLATION.md).
