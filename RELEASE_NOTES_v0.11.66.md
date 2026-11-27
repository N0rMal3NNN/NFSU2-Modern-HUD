# v0.11.66 BETA — Frontvex Racing & My Car

A cumulative desktop update since v0.11.60. Create and share your own Free Roam race tracks, challenge a Frontvex friend to a 1v1, or test your car with real Car Feed telemetry.

## Frontvex Racing

- Record named custom routes from the car's 3D coordinates, with start and finish gates and sequential checkpoints.
- My Tracks: preview, save, load, delete, and share routes with registered online friends. Accept and save a shared track before challenging its owner.
- Solo Test: practice your own route with automatic countdown and finish statistics.
- PvP 1v1: race invitations, notifications, automatic route loading, live opponent marker and position, synchronized countdown, and direct WebRTC communication.
- Both drivers must be staged behind START, stationary for two seconds, and within 5 m of each other for the automatic PvP countdown. Both need this desktop version.
- Green START, white checkpoint and red FINISH lines (24 m wide). Optional 3D pins, adjustable checkpoint opacity, height and visibility range.
- Configurable Racing overlay above the original minimap, predictive turn arrow, next-turn distance, progress, race timer, colors, size, opacity and position.
- Burnouts during the countdown are permitted; crossing START early is a false start.
- Finish HUD: gold first place (including Solo Test), silver second place, race time, maximum and average speed, distance and nitrous activations.
- Local Race History stores the latest 50 detailed results, while cumulative wins, losses, ties, Solo Tests and win rate are stored separately. Delete Race History includes confirmation.
- Optional bilateral Pause Test Mode for testing on a single PC; leave it disabled for normal races.

## My Car

- Performance Monitor: start a test, accelerate and come to a stop to save 0–100, 0–200, 100–200 km/h, quarter-mile, top-speed and braking-distance measurements where completed.
- Latest Result and Personal Best per supported car identity; nitrous use is detected automatically. Turbo installation is selected manually, since the feed does not expose this upgrade.
- Driving Statistics: trip distance, driving time, maximum and average speed, gear shifts, nitrous activations, impacts and jump statistics.
- Independent trip and statistics reset controls; existing odometer and performance records remain separate.
- Optional Jump Monitor displays airborne time and holds the completed jump result for four seconds.

## Screenshots

The following screenshots show the preceding tested development build with the same Racing and Jump Monitor interface. Images are included in the release upload package.

- PvP Career Statistics: `assets/frontvex-racing-career-v0.11.66.webp`
- Race results: `assets/frontvex-racing-results-v0.11.66.webp`
- My Tracks: `assets/frontvex-racing-tracks-v0.11.66.webp`
- Jump Monitor: `assets/frontvex-jump-monitor-v0.11.66.webp`
- Racing overlay and 3D start/finish markers: `assets/frontvex-racing-hud-v0.11.66.webp`

## Compatibility and privacy

The extension uses the official read-only Car Feed and View Feed. Race routes, history and car statistics are stored locally. PvP exchanges race data directly with a friend when the WebRTC connection succeeds; it is a friendly racing system, not a server-verified competitive leaderboard. No production server update is required. Cross-network PvP still needs real-world testing. Mobile Userscript BETA 5 remains available separately.

Special thanks to [OBD Gaming](https://www.facebook.com/overbudgetgg) for the inspiration behind the Frontvex in-game phone. Your idea helped bring this feature to life!
