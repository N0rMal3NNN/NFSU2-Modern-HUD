# v0.11.60 BETA — Frontvex Software Update

The Software Update app in the Frontvex phone displays the installed and latest public desktop version, release date and last successful check.

- Automatic version checks when the game opens and every 30 minutes, with shared cached results between game tabs.
- Manual **Check for Updates**, with a short request cooldown.
- A software update notification and sound (subject to notification settings and browser audio permissions), once per newly detected release per browser profile.
- A red update badge stays on the app icon while a newer version is available.
- **Download Update** opens the official Latest Chromium ZIP; **What's New** opens the changelog.
- No Frontvex account required. Version metadata is read from the project's GitHub repository; no account information is sent to the update endpoint.
- Updates are downloaded and installed manually. If GitHub is unreachable, the app reports the unsuccessful check rather than claiming the installation is current.

The update channel is for public desktop Chromium builds only. Mobile Userscript BETA 5 remains available separately.


**Availability:** the v0.11.60 package is prepared for upload. Until publication, the official Latest ZIP remains v0.11.59.

See [Downloads](DOWNLOADS.md) and [Installation](INSTALLATION.md). Replace files in the same extension folder and reload the extension and game to retain local settings.
