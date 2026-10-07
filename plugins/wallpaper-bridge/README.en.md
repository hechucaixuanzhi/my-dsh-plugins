# DSH Wallpaper Bridge / DSH 壁纸桥

[中文](README.md) | English

Display the active wallpaper from your local Wallpaper Engine installation inside DeepSeek Harness, with wallpaper-based colors, transparency and glass effects.

An independent community project, not an official DeepSeek, Steam or Wallpaper Engine product. The internal package name `@dsh-local/we-skin` and configuration namespace remain unchanged for compatibility.

## Version and requirements

- Plugin: `0.3.6-dsh020rc2.1`, first public prerelease.
- Integration target: **DSH Desktop `0.2.0-rc.2` on Windows**. Other DSH versions are not claimed compatible.
- Install Wallpaper Engine locally and apply a wallpaper first. No extra model key or model calls are required.
- This is a wallpaper bridge and theme utility, not a Wallpaper Engine renderer or screen-capture tool.

## Capabilities

| Wallpaper type | Display behavior and limits |
| --- | --- |
| Image / GIF | Direct display of browser-supported formats |
| Video | Looping playback of browser-supported formats, muted by default; decoding depends on DSH's Chromium |
| Web | Isolated iframe with default wallpaper properties and limited API stubs; not the complete WE API. Same-origin, connection-request or advanced-API dependencies may fail |
| Scene `scene.pkg` | Finds embedded PNG/JPEG artwork, otherwise uses the preview. **No scene animation, particles, lighting, audio response or 3D effects** |

Controls include cover, contain, native size, stretch, 0.25–4× zoom, horizontal/vertical focus, transparency, blur, color strength and transitions. View settings are saved per wallpaper ID; reset only the current wallpaper's view when needed.

The current implementation selects the first valid `MonitorN` wallpaper. **Automatic monitor selection based on the DSH window is not implemented.** Historical `monitorMode` configuration is not a completed UI feature.

## Install, upgrade and uninstall

### Recommended: standalone package

1. Open **Plugins → Add plugin** in DSH's left sidebar.
2. Paste the entire URL below into the **package name / GitHub address / local path** input, **not Registry / Custom address**.

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/wallpaper-bridge-v0.3.6-dsh020rc2.1/dsh-local-we-skin-0.3.6-dsh020rc2.1.tgz
```

3. Keep the default registry or select official npm / the Mainland China mirror. It controls dependency downloads, not the GitHub address.
4. Install and confirm `@dsh-local/we-skin` is enabled.
5. Save drafts, wait for active tasks to finish, fully quit DSH and reopen it.
6. Open **Settings → DSH 壁纸桥** to check the active wallpaper and adjust its appearance. The plugin list may still show the internal package name; this is intentional compatibility, not a failed installation.

### Download and install locally

Download the `.tgz` from the [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/wallpaper-bridge-v0.3.6-dsh020rc2.1). Do not extract it. Enter its real absolute path in the same input, for example:

```text
file:D:/DSH-plugins/downloads/dsh-local-we-skin-0.3.6-dsh020rc2.1.tgz
```

For a repository checkout, enter the absolute single-plugin directory, such as `D:/my-dsh-plugins/plugins/wallpaper-bridge`, not the repository root or the parent `plugins` directory.

This package is not on npm: its name alone cannot download it. The whole repository URL refers to a multi-plugin collection and is not this plugin's installation source. Source code archives are not standalone `.tgz` plugin packages either.

### Upgrades and removal

The current DSH plugin UI does not automatically update plugins. Disable and uninstall the old version, install the new version, then fully quit and reopen DSH. Back up your own wallpaper configuration first. Do not delete DSH accounts, chat history or other plugins.

Settings stay in `DSH_HOME/storages/we-skin/config.json`; default `DSH_HOME` is `.dsh` under the user's home directory. The legacy `%APPDATA%/dsh-skin-we/config.json` is read for compatibility and never automatically deleted. Extracted scene images are cached under `%APPDATA%/dsh-skin-we/art/` (under the user's home if APPDATA is absent). The plugin provides no user-data wiping operation.

## Discovery and troubleshooting

- Discovery checks common Steam locations and the Windows Steam registry. For other layouts, set `DSH_WE_CONFIG` to your own `wallpaper_engine/config.json` in the environment that launches DSH, then reopen DSH; no source edits are needed.
- Use **重新检测** after switching wallpapers. Host polling is 750ms; Desktop polls every second. Web retains SSE plus a 2.5-second fallback, but native Web acceptance is not claimed in this release.
- Static artwork or a preview for scene wallpapers is expected. For black video, try a browser-supported MP4 / WebM first. Videos start muted.
- A web wallpaper may depend on capabilities prohibited by isolation. Do not add `allow-same-origin` or remove the sandbox to work around this.
- The plugin reads WE settings and wallpaper files without modifying WE configuration. It does not launch Wallpaper Engine.

## Security, privacy and artwork

- Code runs with local-user privileges. Plugin routes accept only loopback HTTP / internal Desktop transport. This is not a mobile, LAN or internet wallpaper-sharing service; local routes are not an OS security sandbox.
- No model keys, account balances or chat history are read; no telemetry is added. Diagnostics/state contain local wallpaper paths: do not upload them unchanged.
- Web wallpapers are third-party code. The script-enabled iframe excludes `allow-same-origin`; HTML responses also carry sandbox CSP and block connection requests. This is not complete network or malicious-content isolation: external images and other resources may still load. Use trusted wallpapers only.
- No Wallpaper Engine executable, Workshop artwork, screenshots, music or character art is distributed. Obtain your own wallpapers lawfully; the code license grants no wallpaper rights.

## Validation and feedback

The public copy adds offline checks for configuration, file boundaries, video Range requests, Desktop polling, web isolation and module loading. See [release checks](../../docs/release-checks/wallpaper-bridge.md) for packaging, redaction and automated-check scope.

The original local version has desktop usage evidence, **not full native acceptance of this public version**. This public version still needs actual installation and image, video, web, scene and multi-monitor testing; it is therefore a prerelease. Automated success does not validate every native scenario.

Report [issues](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues) with DSH/plugin versions, wallpaper type and redacted reproduction steps. Do not include private configuration, complete personal paths or copyright-restricted wallpaper files.

## License and provenance

[MIT License](LICENSE), retaining original contributor attribution and community references in [NOTICE.md](NOTICE.md). This plugin is independent of Session Panel, SillyTavern and pets.
