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
