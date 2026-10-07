# My DSH Plugins

[中文](README.md) | English

Independent community plugins for DeepSeek Harness Desktop, maintained in one repository. Each plugin has its own directory, version, documentation and installable package. **This is not an official distribution or a combined plugin installer.**

## Plugin catalog

| Plugin | Latest version | Supported DSH | Purpose | Install |
| --- | --- | --- | --- | --- |
| [Session Panel / 侧边会话](plugins/session-panel/README.en.md) | `2.4.0-dsh020rc2.9` | Desktop `0.2.0-rc.2` | Independent side Agent with read-only access to its main conversation's messages, trajectory and activity | [Standalone package](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) |

Only Session Panel is included so far. SillyTavern, wallpaper and pet integrations are separate plugins and are not bundled into this release.

## Installation

### Recommended: paste the package URL in Desktop

First confirm DSH Desktop is `0.2.0-rc.2`. Open **Plugins → Add plugin** in the left sidebar and paste the complete line below into the **Package name or address** field, **not the Registry / Custom address field**:

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/session-panel-v2.4.0-dsh020rc2.9/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

1. Keep the default, official npm or Mainland China registry. This selects the npm download source, not a GitHub repository location; dependency downloads may still use it.
2. Click **Install**, wait for completion and confirm `@dsh-local/session-panel` is enabled in the installed list. This package is not published to npm; entering only its package name will not install it.
3. Save drafts and wait for active tasks to finish. Use the application menu's **Exit/Quit** or the tray's **Quit** action, then reopen DSH. Refreshing the page or clicking the window's close button is not a full quit.
4. Open **Start → 侧边会话** in the right pane. If collapsed, press `Ctrl + Alt + B`.

### Alternative: a local file or single-plugin directory

If GitHub downloads fail, manually download the `.tgz` from the [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9). **Do not extract it.** Enter this form in the same field, replacing the example with its actual absolute path, without quotes:

```text
file:D:/DSH-plugins/downloads/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

Alternatively, download and extract this repository and enter the absolute directory of `plugins/session-panel`. For a checkout at `D:/DSH-plugins/my-dsh-plugins`, use:

```text
D:/DSH-plugins/my-dsh-plugins/plugins/session-panel
```

These directories are examples and must actually exist. Do not enter the whole repository's GitHub URL, a GitHub `tree/...` page, the repository root, the parent `plugins` directory or GitHub's generated Source code archive: none is this plugin's standalone package.

For “path does not exist or is not a valid plugin package,” check that the path is absolute and the file has downloaded, or that the directory directly contains `package.json` and `cordis.patch.yml`. The current UI requires uninstalling the old package before installing an upgrade; do not clear DSH data. See the [plugin guide](plugins/session-panel/README.en.md#install-upgrade-and-uninstall) for details and troubleshooting.

See the [official plugin-manager documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md) for install-spec forms. This plugin's compatibility remains limited to the version listed above.

No additional model key is required: the plugin uses DSH's configured models and permissions. Normal charges for the selected model still apply. Compatibility is limited to the version listed above, not future DSH releases.

## Boundaries

- The side Agent works independently and may perform authorized tasks. Its main-observation interface is read-only and cannot deliver messages into the main conversation.
- Main-conversation summaries and records retrieved on demand enter the side Agent's model context and may include private content. Consider your chosen provider's and account's data policies before use.
- Plugins and general tools run with the local user's privileges; this is not an OS sandbox. Workspaces, model context and accounts are managed by DSH and are not distributed in this repository.
- See the [release checks](docs/release-checks/session-panel.md) and [SECURITY.md](SECURITY.md) for acceptance scope, recovery limitations and privacy details.

## Update policy

**Every plugin addition or update must update this file and [README.md](README.md) in the same commit.** Also update that plugin's Chinese and English READMEs, CHANGELOG and version when required. Keep versions, compatibility, installation links, capabilities and limitations aligned.

Repository checks and GitHub Actions fail plugin changes missing either root README update. This is checked, not just a convention. See [CONTRIBUTING.md](CONTRIBUTING.md). Passing checks do not validate untested Desktop versions or scenarios, or imply that branch protection has been configured.

## Development and license

Use Node.js 24. Run `npm test` and `npm run check` without installing repository dependencies. Packages use explicit file allowlists. Never commit `dist/`, local configuration, credentials, sessions, logs, screenshots or private testing environments.

Original repository code is [MIT-licensed](LICENSE). DeepSeek Harness integration attribution is in [NOTICE.md](plugins/session-panel/NOTICE.md). Future third-party plugins must retain their own licenses and asset attribution; this repository's original-code notice must not be applied to them indiscriminately.
