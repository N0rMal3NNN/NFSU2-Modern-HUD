# NFSU2 Modern HUD — Downloads & Version Archive

Choose **Download Latest** for the newest publicly published version, or choose a numbered archive below to install an older version. All ZIPs contain two separate browser folders: **Chromium** and **Firefox**.

## Latest version

**v0.9.77** — [Download Latest (Chromium + Firefox)](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/downloads/NFSU2_Modern_HUD_LATEST_MultiBrowser.zip)

This URL remains the same across updates. Each new public release must update the `downloads/NFSU2_Modern_HUD_LATEST_MultiBrowser.zip` file to exactly match the latest numbered release ZIP.

## Choose a version

| Version | Download | Release information |
|---|---|---|
| **v0.9.77** — latest | [Download v0.9.77](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/downloads/NFSU2_Modern_HUD_v0.9.77_MultiBrowser.zip) | [Release notes](RELEASE_NOTES_v0.9.77.md) |
| v0.9.73 | [Download v0.9.73](https://github.com/N0rMal3NNN/NFSU2-Modern-HUD/raw/refs/heads/main/downloads/NFSU2_Modern_HUD_v0.9.73_MultiBrowser.zip) | [Release notes](RELEASE_NOTES_v0.9.73.md) |

Older versions remain available here for compatibility and testing. These are the numbered ZIP archives currently stored in this repository; development/test versions were not necessarily public releases.

## Installation

[Read the installation and upgrade guide](INSTALLATION.md). To keep locally stored odometer data and settings, upgrade the files in your existing extension folder instead of creating an unrelated new installation.

**Do not use GitHub's green Code → Download ZIP button for installing the extension.** That command downloads the entire GitHub source repository, potentially containing multiple version archives.

### Maintainer release checklist

When publishing another public version:

1. Add the new `downloads/NFSU2_Modern_HUD_vX.Y.Z_MultiBrowser.zip`.
2. Replace `downloads/NFSU2_Modern_HUD_LATEST_MultiBrowser.zip` with the **same exact ZIP bytes**.
3. Update the version number and table in this file, the main README, and the installation instructions.
4. Keep the older numbered ZIPs in the archive.
5. Verify the two ZIP files match before merging the update.

This keeps Download Latest stable while letting visitors choose an older build.
