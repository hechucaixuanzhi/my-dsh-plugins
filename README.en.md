# My DSH Plugins

[中文](README.md) | English

Open-source community plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Desktop. Each plugin is installed and versioned independently.

This project is not affiliated with DeepSeek. The repository root is not an installable plugin; follow the instructions below for the plugin you want.

## Plugins

| Plugin | Latest version | Compatible DSH | Features | Download |
| --- | --- | --- | --- | --- |
| [Session Panel / 侧边会话](plugins/session-panel/README.en.md) | `2.4.0-dsh020rc2.9` | Desktop `0.2.0-rc.2` | Independent side Agent with read-only access to the main conversation's messages, execution trajectory and activity | [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) |

## Prerequisites

- Install a compatible DSH Desktop version listed above.
- Configure an account or model in DSH and confirm ordinary conversations work.
- Plugins reuse DSH's configured models and permissions without requiring another model key. Model calls remain subject to the selected provider's billing rules.

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

The current plugin is not published to npm, so its package name alone is not an installation source. The whole repository URL, its root directory and GitHub's generated Source code archives are not standalone plugin installation entries.

## Using Session Panel

Session Panel gives each main conversation its own side history and draft. It reuses official conversation components for streamed replies, images, attachments, `@`, `/`, model selection and stopping tasks.

While the main task runs, you can ask:

> What stage is the main task at? Use its execution records to explain what it recently completed.
>
> What does this technical term in the main conversation mean? Explain it in the context of the current task.

The side Agent can also perform separate authorized tasks. Its main-observation interface is read-only and cannot send messages into the main conversation. Stopping either task does not stop the other.

See the [Session Panel documentation](plugins/session-panel/README.en.md) for capabilities, data handling and limitations.

## Upgrades and compatibility

- Check the plugin's [CHANGELOG](plugins/session-panel/CHANGELOG.md) and compatible DSH version before upgrading.
- The current DSH UI does not automatically update plugins. Disable and uninstall the old plugin, install the new version, then fully quit and reopen DSH.
- Do not delete conversation history, clear account configuration or remove unrelated plugins.
- Support is limited to the DSH version listed above. Confirm plugin compatibility before upgrading DSH.

## Security and privacy

- Plugins and general tools run with the local user's privileges, not in an OS sandbox. Review the source and required permissions before installing.
- Main-conversation records read by the side Agent enter the selected model's context and may contain private information. Review your model provider's data policies.
- This repository does not distribute account configuration, keys or chat history. Session Panel adds no telemetry or separate cloud backend.

See [SECURITY.md](SECURITY.md) for security reporting and redaction guidance.

## Documentation and feedback

- [Session Panel user guide](plugins/session-panel/README.en.md)
- [Release and validation notes](docs/release-checks/session-panel.md)
- [Bug reports and feature requests](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues)

Include the DSH version, plugin version, reproduction steps and redacted screenshots in reports. Do not upload keys, account configuration or complete session files.

## Contributing

Issues, documentation improvements and plugin adaptations are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development environment, checks and contribution process.

## License

Original repository code is licensed under the [MIT License](LICENSE). See [NOTICE.md](plugins/session-panel/NOTICE.md) for DeepSeek Harness attribution and upstream licensing.
