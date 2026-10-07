# My DSH Plugins

[中文](README.md) | English

Independent community plugins for DeepSeek Harness Desktop, maintained in one repository. Each plugin has its own directory, version, documentation and installable package. **This is not an official distribution or a combined plugin installer.**

## Plugin catalog

| Plugin | Latest version | Supported DSH | Purpose | Install |
| --- | --- | --- | --- | --- |
| [Session Panel / 侧边会话](plugins/session-panel/README.en.md) | `2.4.0-dsh020rc2.9` | Desktop `0.2.0-rc.2` | Independent side Agent with read-only access to its main conversation's messages, trajectory and activity | [Standalone package](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) |

Only Session Panel is included so far. SillyTavern, wallpaper and pet integrations are separate plugins and are not bundled into this release.

## Installation

1. Download the plugin's own `.tgz` asset from its Release. Do not install the entire repository URL as if it were one plugin.
2. In DSH, open **Plugins → Add plugin** and enter the downloaded file's absolute local path as a `file:` install source. Alternatively, download this repository and select the absolute local path to `plugins/session-panel`, not the repository root.
3. Enable the plugin. Save unsent drafts, wait for active tasks to finish, then fully quit and reopen Desktop; a page refresh is not enough.
4. Open the right-hand **Start → 侧边会话** entry. See the [plugin guide](plugins/session-panel/README.en.md).

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
