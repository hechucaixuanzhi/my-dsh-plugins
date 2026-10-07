# My DSH Plugins

[中文](README.md) | English

Open-source community plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Desktop. Each plugin is installed and versioned independently.

This project is not affiliated with DeepSeek. The repository root is not an installable plugin; follow the instructions below for the plugin you want.

## Plugins

| Plugin | Latest version | Compatible DSH | Features | Download |
| --- | --- | --- | --- | --- |
| [Session Panel / 侧边会话](plugins/session-panel/README.en.md) | `2.4.0-dsh020rc2.9` | Desktop `0.2.0-rc.2` | Independent side Agent with read-only access to the main conversation's messages, execution trajectory and activity | [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) |
| [DSH Wallpaper Bridge / 壁纸桥](plugins/wallpaper-bridge/README.en.md) | `0.3.6-dsh020rc2.1` (prerelease) | Windows Desktop `0.2.0-rc.2` | Local Wallpaper Engine backgrounds, adaptive colors and transparency; static artwork only for scenes | [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/wallpaper-bridge-v0.3.6-dsh020rc2.1) |

## Prerequisites

- Install a compatible DSH Desktop version listed above.
- Session Panel: configure an account/model in DSH and confirm ordinary conversations work. It reuses existing models/permissions without another key; calls follow the provider's billing rules.
- Wallpaper Bridge: install Wallpaper Engine locally and apply a wallpaper. No model configuration or calls are needed. Native installation acceptance of the public copy is pending; see [validation scope](docs/release-checks/wallpaper-bridge.md).

## Quick start

The following instructions install Session Panel.

1. Open **Plugins → Add plugin** in DSH's left sidebar.
2. Paste the complete URL below into **Package name or address**, **not Registry / Custom address**.

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/session-panel-v2.4.0-dsh020rc2.9/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

3. Keep the default registry or choose official npm or the Mainland China mirror. This option controls npm package and dependency downloads; it is not a GitHub URL field.
4. Click **Install**, then confirm `@dsh-local/session-panel` is enabled.
5. Save drafts and wait for active tasks to finish. Fully quit DSH through its application menu or tray, then reopen it. Refreshing the page or closing the window may not restart the application.
6. Choose **Start → 侧边会话** in the right pane. If collapsed, press `Ctrl + Alt + B`.

### Local installation

If the direct download fails, download the standalone `.tgz` from the [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9). Do not extract it. Enter its absolute local path in the same field, for example:

```text
file:D:/DSH-plugins/downloads/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

Replace the example with the file's actual location, without quotes. Installing a single-plugin directory from a checkout is also supported; see the [complete installation and troubleshooting guide](plugins/session-panel/README.en.md#install-upgrade-and-uninstall).

Neither current plugin is published to npm, so package names alone are not installation sources. The whole repository URL, its root directory and GitHub's generated Source code archives are not standalone plugin installation entries.

### Install DSH Wallpaper Bridge

Paste the separate Wallpaper Bridge package URL into the same **Add plugin** input:

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/wallpaper-bridge-v0.3.6-dsh020rc2.1/dsh-local-we-skin-0.3.6-dsh020rc2.1.tgz
```

Confirm `@dsh-local/we-skin` is enabled, save drafts, wait for tasks to finish and fully quit/reopen DSH. Open **Settings → DSH 壁纸桥**. The public name changes; the internal package name and configuration locations are retained. Images, browser-decodable video and limited web wallpapers are supported. **Scenes use extracted static artwork or previews, not dynamic scene effects.**

See the [Wallpaper Bridge guide](plugins/wallpaper-bridge/README.en.md) for local installation, discovery failures, upgrades and limitations. No Workshop assets are bundled.

## Using Session Panel

Session Panel gives each main conversation its own side history and draft. It reuses official conversation components for streamed replies, images, attachments, `@`, `/`, model selection and stopping tasks.

While the main task runs, you can ask:

> What stage is the main task at? Use its execution records to explain what it recently completed.
>
> What does this technical term in the main conversation mean? Explain it in the context of the current task.

The side Agent can also perform separate authorized tasks. Its main-observation interface is read-only and cannot send messages into the main conversation. Stopping either task does not stop the other.

See the [Session Panel documentation](plugins/session-panel/README.en.md) for capabilities, data handling and limitations.

## Upgrades and compatibility

- Before upgrading, check the relevant [Session Panel CHANGELOG](plugins/session-panel/CHANGELOG.md) or [Wallpaper Bridge CHANGELOG](plugins/wallpaper-bridge/CHANGELOG.md) and compatible DSH version.
- The current DSH UI does not automatically update plugins. Disable and uninstall the old plugin, install the new version, then fully quit and reopen DSH.
- Do not delete conversation history, clear account configuration or remove unrelated plugins.
- Support is limited to the DSH version listed above. Confirm plugin compatibility before upgrading DSH.

## Security and privacy

- Plugins and general tools run with the local user's privileges, not in an OS sandbox. Review the source and required permissions before installing.
- Main-conversation records read by the side Agent enter the selected model's context and may contain private information. Review your model provider's data policies.
- This repository does not distribute account configuration, keys or chat history. Session Panel adds no telemetry or separate cloud backend.
- Wallpaper Bridge reads no chats or model keys. It reads local WE settings/artwork and saves its own display settings/static-image cache. Web wallpapers remain third-party code; use trusted assets. [Isolation and network limits](plugins/wallpaper-bridge/README.en.md#security-privacy-and-artwork) are not a complete security sandbox.

See [SECURITY.md](SECURITY.md) for security reporting and redaction guidance.

## Documentation and feedback

- [Session Panel user guide](plugins/session-panel/README.en.md)
- [Wallpaper Bridge user guide](plugins/wallpaper-bridge/README.en.md)
- [Session Panel validation](docs/release-checks/session-panel.md) · [Wallpaper Bridge validation](docs/release-checks/wallpaper-bridge.md)
- [Bug reports and feature requests](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues)

Include the DSH version, plugin version, reproduction steps and redacted screenshots in reports. Do not upload keys, account configuration or complete session files.

## Contributing

Issues, documentation improvements and plugin adaptations are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development environment, checks and contribution process.

## License

Original repository code is licensed under the [MIT License](LICENSE). Plugins retain their own licenses and attribution: [Session Panel](plugins/session-panel/NOTICE.md), [Wallpaper Bridge](plugins/wallpaper-bridge/NOTICE.md). Code licensing does not grant artwork rights.
