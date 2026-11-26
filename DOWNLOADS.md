# NFSU2 Modern HUD — Downloads & Version Archive

**Supported desktop browsers:** Google Chrome, Microsoft Edge, Brave, Opera, Opera GX, Vivaldi and other compatible Chromium-based desktop browsers.

**Phones and tablets:** Userscript BETA 4 (based on v0.11.10) — iPhone: Safari + Userscripts (working); Android: Microsoft Edge + Tampermonkey (working, tested with RacerXC) — see [Phones and tablets](#phones-and-tablets-userscript-beta-4) below.

## Download Latest

**Current version: v0.11.26**

**[Download Latest — Chromium ZIP](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/downloads/NFSU2_Modern_HUD_LATEST_Chromium.zip)**

This permanent URL always points to the most recent public Chromium-only build. Each ZIP contains one `NFSU2-HUD-Chromium/` extension folder.

## Choose a version

| Version | Download | Release information |
|---|---|---|
| **v0.11.26 — Latest** | [Download v0.11.26](downloads/NFSU2_Modern_HUD_v0_11_26_Chromium.zip) | [What's new](RELEASE_NOTES_v0.11.26.md) |
| v0.11.10 | [Download v0.11.10](downloads/NFSU2_Modern_HUD_v0_11_10_Chromium.zip) | [What's new](RELEASE_NOTES_v0.11.10.md) |
| v0.11.7 | [Download v0.11.7](downloads/NFSU2_Modern_HUD_v0_11_7_Chromium.zip) | [What's new](RELEASE_NOTES_v0.11.7.md) |
| v0.11.5 | [Download v0.11.5](downloads/NFSU2_Modern_HUD_v0.11.5_Chromium.zip) | [What's new](RELEASE_NOTES_v0.11.5.md) |
| v0.10.7 | [Download v0.10.7](downloads/NFSU2_Modern_HUD_v0.10.7_Chromium.zip) | [What's new](RELEASE_NOTES_v0.10.7.md) |
| v0.10.4 | [Download v0.10.4](downloads/NFSU2_Modern_HUD_v0.10.4_Chromium.zip) | [What's new](RELEASE_NOTES_v0.10.4.md) |
| v0.9.77 | [Download v0.9.77](downloads/NFSU2_Modern_HUD_v0.9.77_Chromium.zip) | [Release notes](RELEASE_NOTES_v0.9.77.md) |
| v0.9.73 | [Download v0.9.73](downloads/NFSU2_Modern_HUD_v0.9.73_Chromium.zip) | [Release notes](RELEASE_NOTES_v0.9.73.md) |

All archived downloads contain only the Chromium extension. The version numbers refer to the original functional releases.

## Phones and tablets: Userscript BETA 4

| Package | Download | Release information |
|---|---|---|
| **Userscript BETA 4 (v0.11.10.4)** | [Download ZIP](downloads/NFSU2_Userscripts_BETA_4.zip) · [raw `.user.js`](userscript/NFSU2_Modern_HUD.user.js) | [What's new](RELEASE_NOTES_v0.11.10.md#userscript-beta-4-for-phones-and-tablets) |

- **iPhone / iPad:** Safari + **Userscripts** — working, tested by the project owner.
- **Android:** Microsoft Edge + **Tampermonkey** — working, tested by the project owner and by **RacerXC** (first Android beta tester).
- Other Android browsers and userscript managers are not tested.

Based on the v0.11.10 HUD with a small draggable ⚙ launcher that remembers its Portrait and Landscape position. Settings and odometer of the userscript are stored separately from the desktop extension. Step-by-step instructions: [Phones and tablets: Userscript BETA 4](INSTALLATION.md#phones-and-tablets-userscript-beta-4).

## Installation and preserving mileage

[Installation and upgrade instructions](INSTALLATION.md).

Extract the archive and load the `NFSU2-HUD-Chromium/` folder using the browser's extension manager.

When upgrading, use the same installed folder and browser profile to preserve your extension-local settings and odometer records. Profile JSON does not include mileage.

GitHub's green **Code → Download ZIP** downloads the full repository rather than the current release archive. Use **Download Latest** above.

## Maintainer release checklist

1. Add the numbered Chromium ZIP archive.
2. Update `downloads/NFSU2_Modern_HUD_LATEST_Chromium.zip` with identical bytes.
3. Update README, installation instructions, release notes and this version archive.
4. Retain previous Chromium-only numbered archives.
5. Verify ZIP integrity and that the stable and numbered current archives match.
6. Userscript: keep `userscript/NFSU2_Modern_HUD.user.js` and `downloads/NFSU2_Userscripts_BETA_4.zip` (it contains the same `.user.js`) in sync, and update the version in the table above.
