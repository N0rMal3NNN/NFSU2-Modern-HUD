v0.11.79 — Public BETA
Rain Volume factory default 70%; saved settings retained. Audio gain +10% relative, peak-limited to prevent clipping. Smooth 1.35 s fade-in and 2.4 s fade-out with continuity on rapid changes. Cockpit-only and dynamic rain intensity remain default ON. Gradual drying preserves the opacity/size at the start of drying; no new droplets while dry. Existing glass state, damage timers, and settings retained. Bridge/tunnel detection is not included: no verified shelter signal.

v0.11.68.2 — Performance HUD Settings (TEST BUILD)
My Car → HUD Settings: X/Y offsets, size, opacity, Live + Results / Results Only / Hidden. Final results display for 10 seconds. Preview and reset; preferences saved locally across cars.

v0.11.68 — My Car Performance Lab (TEST BUILD)
- Car Setup: nine upgrade categories, Stock / Stage 1–3 / Custom / Unknown, unique per part, manual 0–2 nitro bottle capacity, per-car local setup.
- Performance Test: Manual Finish (Ctrl+Alt+F default, configurable), Auto Finish, live HUD, existing and additional speed intervals, mile distances, braking, G forces, slip, suspension, nitro depletion/refill estimates.
- Compare Results: snapshots of all parts, measured differences, approximate route and test-condition warnings, speed graph. No actual turbo PSI, nitro pressure, HP or torque in feed.
- Test History: latest 50 per car, legacy latest/PB migrated without inventing setup, capped setup-specific PB categories, confirmation for deletion. Graph sampled and compacted for local storage.
- All test types use available telemetry; selected type is a comparison tag. No new network requests or server changes. Real game test pending.

v0.11.67 — Software Update: supports three- and four-part version numbers. Racing and My Car unchanged.

v0.11.66 — Frontvex Racing & My Car: automatic PvP start requires both cars to be ready and within 5 m of one another (3D distance). Both players need v0.11.66. Solo is unchanged.

v0.11.65.8 — Enable Start With Pause (Test Mode), OFF by default. Turn ON on both clients before starting a new PvP lobby. Background/paused staging can retain a stationary position behind START; actual telemetry is required for movement and finish. Pause time counts in race time. 120-second grace; no server changes.

v0.11.65.7 Public Test — Share Track first; receiver must Accept & Save Track, then Challenge Friend is enabled for that friend/track. Race invitation has notification and badge; Accept confirms and loads both players into automatic staging. Existing tracks are preserved; share again once to establish confirmation. No server update.

v0.11.65.7 Public Test — persistent PvP career statistics, Win Rate and Solo totals independent of the last 50 results. Existing retained results seed the counters once. Delete Race History resets both.

v0.11.65.5 Public Test — Delete Race History with confirmation. Clears only local Solo/PvP results and derived win/loss/tie counts. Tracks, ODO and My Car stay intact.

v0.11.65.4 Public Test — Automatic PvP countdown after both players continuously hold still behind START for 2 seconds. Manual Ready / Start removed; host schedules existing synchronized countdown. Burnout during countdown remains allowed until START gate crossing. Solo Test unchanged. Both players require v0.11.65.4.

v0.11.65.3 Public Test — Gold first-place and Solo finish titles, silver second-place title; soft glow. Results HUD remains enlarged by 50% and visible for 10 seconds. No race logic or storage changes.

v0.11.65.2 Public Test — Racing results HUD enlarged 50%; visible for 10 seconds (Solo and PvP). Race History layout unchanged.
v0.11.65.1 Public Test — Countdown allows throttle and handbrake behind START; false start uses actual gate crossing. Solo and PvP.
v0.11.65 Public Test — Solo Test, PvP challenge, Ready, synchronized countdown, live positions, race end statistics and local race history. Both players need this build. Direct P2P only; no server changes.
v0.11.64.3 — Racing checkpoint gates
- START, FINISH and active checkpoint share a 24 m transverse gate (12 m each side). Checkpoints require ordered forward crossing with height tolerance. White active checkpoint line and pin default to 50% opacity; old 100% setting migrates once, other opacity values retained. Existing height/range/color controls apply. Practice only; no server changes.

v0.11.64.2 — Racing Practice gates, predictive navigation and checkpoint settings
- Racing Settings: checkpoint opacity 0–100%, 3D height 0.5–20 m (default 3.2 m), 3D visibility range 0–5000 m (0 = unlimited). Settings are local; visibility does not change checkpoint validation.
- Load Track (Practice): stop within 12 m behind START facing along the route. Countdown 5–1–GO; moving early restarts staging. Timing begins at GO; cross START in the route direction, pass checkpoints in order and cross FINISH.
- START and FINISH are finite 24 m transverse gates, derived from route tangent; projected lines use estimated road height (no terrain mesh). Finish crossing checked per feed frame.
- Navigation predicts upcoming turns from route geometry, with speed-dependent lookahead, directional labels and smooth rotation. Track name required before recording and saving. Existing tracks and preferences retained. Practice only, not synchronized multiplayer.

v0.11.64.1 — Racing world pins
- START and FINISH markers projected from actual saved 3D coordinates via the shared read-only View Feed. Practice / Show Racing HUD activates them; independent Show 3D START / FINISH Pins toggle, existing START/FINISH colors, distance labels. No GPS pin storage changes. Screen-space markers do not have terrain occlusion.

v0.11.64 — Racing Phase 2 Public Test
- My Tracks > Practice / Show Racing HUD: independent route overlay, navigation arrow, checkpoint progress, adjustable scale/opacity/X/Y and colors. No original minimap transform is available.
- Share Track: choose saved track and online friend; direct P2P bounded chunks; received tracks in Invitations > Accept & Save or Decline. Both need Phase 2. No server changes; incoming tracks stored locally, transfer/receipt requires active connection.
- PvP countdown, opponent live positions and race results remain upcoming.

v0.11.63 — Frontvex Racing Phase 1 / Turbo setup
- My Car: manual turbo setup before test, label in results HUD and phone; personal best split by turbo and nitro. Legacy results remain Unknown Turbo.
- Racing: Free Roam START/FINISH, recorded 3D route, automatic checkpoints every 100m, local saved tracks, preview, delete with confirmation. No multiplayer yet.
- ODO, driving statistics and 7s performance HUD unchanged.

v0.11.62 — My Car / Driving Statistics
- Одделни менија Performance Monitor и Driving Statistics.
- Results HUD 7 секунди; автоматска статистика по Car ID, локално зачувување.
- Trip и Reset Statistics независни од ODO и Performance.
- Jump Monitor HUD (4 секунди по приземјување), опција за исклучување.
- Driving Time и Average Speed се пресметуваат само во движење.

v0.11.61 — My Car / Performance Monitor
Phone > My Car > Start: stop the car, press Start, drive forward, stop for 1 second. The results HUD remains visible for 5 seconds. Latest Result and Personal Best (with/without nitro) are saved locally per owned vehicle ID, or stock model. ODO is displayed from the existing model odometer. No server changes or registration.

v0.11.55 — Compact inline help and simplified admin confirmation
- Help buttons sit next to labels; related descriptions share a single popup. Live status and safety warnings remain visible.
- Public edition: no administrator interface.

v0.11.55 Public
Public edition: no admin controls.

v0.11.54 BETA — Embedded Frontvex verification
- Official verification opens in a modal iframe in the existing game document; no new tab or navigation. Close cancels the challenge unless proof submission is already completing.
- The background service worker binds proof to the owning tab, nonce, auth frame and document. Real Turnstile proof and signed server reservation remain required.
- Deployment requirement: game CSP must allow the auth origin, and auth response CSP frame-ancestors / X-Frame-Options must allow embedding by nfsu2.xyz (and www). No policy bypass or automatic fallback to navigation. If blocked, close the popup and retry after server configuration is corrected. Live verification has not been tested.

v0.11.52 BETA — Compact help / same-tab verification
- Long explanatory settings text is available via a circled ! button, with Close, Escape and click outside. Live statuses, safety warnings, short labels and controls stay visible. Search still indexes the hidden explanations.
- When required, official Turnstile verification opens in the current game tab. Save game progress before registering. On success, return to the original game URL and restore the registered number from the extension session. The game reloads. No new tab or verification bypass.
- Same-tab return is bound to the original tab and verification nonce. Existing local data and extension storage keys preserved.

v0.11.51 BETA — Storage context handling / Automatic speedometer placement
- Storage adapter handles synchronous and asynchronous native errors; disconnected contexts stop retrying and request a game-tab reload. Temporary HUD save failures retry up to three times. No fallback to website storage. Unsaved data is not claimed to be stored.
- HUD Style / Automatically select speedometer is directly below HUD in Settings and Cars HUD. Existing installation and storage keys preserved.
- Update the existing unpacked extension in the same folder, Reload extension, then reload the game tab. Do not remove the extension.

v0.11.50 BETA — Automatically select speedometer / individual Car ID HUD
- ON: factory HUD by live carModel, independent of carKey. OFF: choose style to save it for owned carKey + model. Stock cars have no per-ID save. Manual mode is default. Existing model links are fallback; ODO stays unchanged.
- Car ID is based on profile and garage slot; it can change.

v0.11.49 BETA — Frontvex Friend Online Notifications
- Contacts > Settings > Notification Settings: Friend online popups (enabled by default), with sound, DND and a local test. Only confirmed Offline -> Online transitions for accepted, unblocked friends; no initial-login or reconnect flood. Existing 60-second presence polling remains unchanged. No unread badge for online status.
- Frontvex popups 3 -> 4 seconds; GPS marker toast 2.4 -> 3.4 seconds; HUD save toast 2.6 -> 3.6 seconds. Sound lengths and confirmation windows unchanged.

v0.11.48 BETA — Frontvex Chat Layout
- Incoming left / outgoing right chat bubbles, chronological history, timestamps and delivery status. No action buttons in message timeline. Received GPS pins grouped once per city and position (within 1 m), Saved state derived from actual local markers. Pending cancellation is grouped separately with confirmation. Repeated sent messages remain in history.

v0.11.47 BETA — Frontvex Communication
Private BETA: enable Contacts → Settings → Enable online communication. Both users need valid registered identities. Direct WebRTC using STUN only; no TURN, no cloud message history. If direct connection fails, messages remain pending. The signaling server needs a separate controlled deployment. Keep extension ID and local data; do not uninstall. GPS: manually share a saved game pin and explicitly save received pins. Read receipts are queued when the actual Messages conversation is visible.

v0.11.41 BETA — Frontvex Permanent Reservation
- Server-authorized permanent reservation support; normal users retain 15-day expiration.
- My Profile shows and copies the public cryptographic FVX registry ID only.
- Requires matching server deployment. Keep existing extension installation and storage; do not uninstall.

v0.11.40 BETA — Frontvex Notifications
Contacts > Settings > Notification Settings: Quick Tone (default), Bubble Pop, Soft Chime, Classic Alert, Digital Chime; preview, volume, fixed 3-second popups, DND and message previews. Closed phone: Steam-style bottom-right toast; open phone: top-of-screen phone banner. Queue groups up to two notifications per banner, with 500 ms gap and one sound per banner. Delayed test button allows closing the phone before a demo arrives. Independent persistent Messages/Contacts badges clear when opening the corresponding app. Test buttons generate local demo badges only. All sounds are embedded from the supplied MP3 archive; no remote sound downloads. Sound requires browser audio activation. Network delivery is not implemented; local storage changes are monitored for future incoming records. Do not publicly release before server and WebRTC testing.

v0.11.39 BETA: Registration uses api.frontvex.com and auth.frontvex.com. Manual registration opens an isolated Turnstile tab if required. Displayed numbers use FVX followed by digits, with leading zeroes preserved. Existing identity and local data are retained. The API is still locked; messaging remains local-only. Legacy identity storage is unchanged. No Cloudflare admin keys included.

v0.11.39 — Frontvex Security Integration (prelaunch)
- My Profile: Save Profile & Reserve Number, Reconnect / Renew, local-only save before activating registry.
- One number per signed P-256 identity; unique while active; expires after 15 days without successful renewal. Existing local profile ID and data preserved. Network identity is generated separately once and remains stable after expiry.
- Checks every six hours while a game tab is open after activation; manual reconnect is available. Local warning at 3 days / 1 day before expiry and after expiry.
- Server stores only number, cryptographic identity, public key and last activity. Friends, messages, username and private key remain local.
- Server is a separate ZIP; must deploy to Cloudflare before number reservation works. WebRTC and message delivery are NOT implemented in this release.

v0.11.37 — Frontvex Contacts (local-only beta)
- Contacts icon: My Profile, Friends, Requests, Messages, Settings and Blocked Users.
- Local profile (20-character username, custom FVX number, hidden random internal ID), pending requests, history limits 20/50/Unlimited and local deletion.
- Offline only: no signaling, WebRTC, verified identity, actual delivery or live online status in this version.

v0.11.36 — Frontvex 3D hardware corrections
- Rounded 3D volume and power buttons (beveled geometry).
- USB-C socket detail on the bottom face, centered through the thickness.
- Clean transparent logo printed in the rear material in both themes; no separate decal plane.
- Weather panel size normalization fixed.

v0.11.35 — Frontvex Finish Update
- Rear logo stays on the back in both Standard and Frontvex themes.
- Frontvex home-screen logo is transparent.
- Added rounder side buttons and a USB-C / Type-C port at the bottom.
- Added a resizable weather panel slider in Phone settings.
- Body / material color label is clearer (the custom color option remains available).

v0.11.34 — Frontvex Logo Update
- Rear logo on the 3D phone for both Default and Frontvex themes, including all frame/case materials.
- Transparent logo on the Frontvex home screen (no opaque poster background).
- Existing rotation and other HUD features unchanged.

v0.11.33 — Frontvex 3D Phone
- 360° rotation: right mouse drag (default) or custom hold key + left mouse drag. Mouse-follow tilt removed.
- Rear triple camera, flash, matching body material; volume buttons closer.
- Default / Frontvex phone theme, existing app icons retained.
- City-labelled speed pins. Choose current city manually; older unlabelled pins migrate to Bayview.
- No server/network communication added.

v0.9.84 — Natural Engine Misfire update
- Each new misfire has a 55% chance to last exactly 1.5 seconds.
- The remaining 45% keep the existing irregular cut durations.
- Drive intervals, Limp Mode damage/repair counters and all HUDs are unchanged.
- Continuous CUT mode is unaffected.

v0.9.83: Standalone TYRES icon +3% (vs v0.9.82), saved Current_Settings(5) layout as factory default: ON, 80%, X=0/Y=0, background opacity 90%, custom frame/background/light colors. Existing saved settings are not overwritten. Limp Mode alert sits above the game’s native lower-right speedometer at a stable position whether other HUDs are enabled or not. GT-R ODO digits now dark on LCD: Toyota Corolla white roll overlay is restricted to Corolla only.

v0.9.82: Standalone status panel — one angled glowing LED per icon, TYRES/ENGINE icons +25%, subtle futuristic detail, all existing custom colors, X/Y, scaling, opacity and toggles retained.

NFSU2 Modern HUD v0.9.81

Ново: независен TYRES/ENGINE/SUSP panel (Ctrl+Alt+N или Numpad /), сопствени бои, позиција, размер и проѕирност.
Limp Mode одделен од главниот HUD, default ON на нова инсталација.
Поправени GT-R ODO цифри и додадено пребарување/категории во менито.
Претходните профили и километража се зачувуваат при upgrade во истата extension папка.

0.11.44: Longer ICE gathering (20 s), connection timeout (75 s), transient disconnect grace, per-request P2P diagnostics, independent lookup and delivery retry timers, synchronized registry/communication banner. No relay or new server permissions. Direct WebRTC still depends on the network.

0.11.44: Bind successful Find Number immediately to FVX identity; wake delivery queue on state changes; preserve unrelated presence data; explicit WebRTC initialization diagnostics and Retry P2P. No server changes.

0.11.45: Fix legacy profile schema after automatic registry renewal; keep existing identity, permanent reservation and pending queues. Normalize loaded, renewed and externally updated profile data. Detailed queue error diagnostics.

0.11.47: Real incoming friend requests, messages and GPS pins trigger notification after local save; deduplicate native storage and direct receipt events. Popup/audio also while Contacts or Messages are open. Preserve badges, selected sounds and all existing identity/queue data.

0.11.47: Messages inbox lists friends with latest message, sender, time and persistent per-conversation unread counts. Opening a conversation queues read receipts, including while offline. Manage Messages centralizes local deletion with scope, multi-selection and confirmation; pending sends unaffected.


v0.11.47: View Feed retries until actual frames, weather timeout 10 seconds, selected marker city label; imported GPS pins auto-record recipient speed in both modes. Existing empty legacy pins are migrated to auto-record (old imports and empty locally planted pins cannot be distinguished).


v0.11.57 (test): Frontvex registration iframe opts into credentialless mode where supported by the browser, before navigation. Existing sandbox, nonce, signed reservation and Turnstile verification remain unchanged. Live registration testing pending.


v0.11.58: Successful registration, verified re-registration, and renewal now notify the communication module immediately. Existing online-communication opt-in is preserved. Manual recovery resets signaling retry delay; an ordinary renewal does not disconnect a healthy socket or take over another game tab.

 v0.11.59: Pin marker management: independent city numbering, local speed records and received-pin choice (keep, replace, or keep both).

 v0.11.60: Software Update app for the public desktop channel. GitHub version checks on launch and every 30 minutes, manual check, once-per-version notification, persistent update badge and manual download. No account required.

0.11.64.1: Optional world-positioned START, FINISH and next checkpoint markers using View Feed projection. During Practice only the current checkpoint is visible in the Racing overlay and 3D layer, and the next appears after a valid pass. Saved route previews still show all checkpoints. No game or server changes.


v0.11.72 — BETA: Dynamic Windshield Engine
- Windshield Glass > Automatic cockpit windshield (default ON when glass is enabled); no manual calibration. Stop below 10 km/h for first scan. Reacquires when car, viewport dimensions or projection change; profiles are session-local.
- Natural rain: fine wet speckles, larger droplets mixed with microdroplets; shape varies approximately 10%, small drops remain stationary at rest. Intensity 0–100%, size, opacity, airflow, lifetime, merge, trails, refraction, safety margin, FPS limit, preview and debug controls.
- Existing reflection, dust, wiper marks, sun strip, impact cracks and Limp Mode glass use the shared contour mask; existing damage rules, repair times, settings and existing features retained. Impact flash/shake and speed effects remain independent. Full-screen legacy glass available by unchecking Automatic cockpit windshield (rain then off).
- Mirror/mount exclusion not implemented in this build; drops and other glass effects can overlap interior objects in the detected contour. Automatic cockpit detection is experimental, based on a camera heuristic and image processing, not an official game cockpit flag. Effects hide when detection/feeds are unreliable. If direct WebGPU canvas is blank, choose Use tab capture and share only the game tab (local processing, no upload). Stop capture available. Disable previous separate debug/rain extension to avoid duplicate effects. Live game/FPS not tested; only local harness and syntax checks.


v0.11.73 BETA — Windshield stability fix
- Confirmed car-local geometry retained while driving; FOV changes no longer invalidate the profile.
- Geometry fallback if visual tracking is temporarily lost; cockpit and vehicle gates remain.
- Preview starts after confirmed detection.
- Rain intensity 0–150%, size 40–200% retained.
- Reduced crack canvas pixel budget, batched paths, coalesced redraws, spatial grid merging.
- Mirror exclusion remains disabled.


v0.11.74 BETA — Persistent Windshield State
Latest version: Dynamic cockpit effects; outside cockpit rain state updates at 4 Hz without drawing or vision. Previous version: original full-screen glass effects, no dynamic rain. Existing crash/Limp timers retained. Rain drying and density 150% shortcut. No mirror exclusion in this beta.


v0.11.75 BETA — App Section Navigation
Секоја апликација со поставки има избор на една секција; другите се скриени. Windshield, Phone и Markers се поделени на помали страници. Постојните поставки, ефекти, профили и тајмери се непроменети. My Car, Racing и Contacts ги задржуваат постојните табови.

