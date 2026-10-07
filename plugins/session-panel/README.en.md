# Session Panel / 侧边会话

[中文](README.md) | English

`@dsh-local/session-panel` · `2.4.0-dsh020rc2.9` · DSH Desktop `0.2.0-rc.2`

An independent, persistent side Agent for each main conversation. Ask what the main task is doing or what a term means while the main task continues, or give the side Agent a separate authorized task.

This is a community plugin, not an official DeepSeek plugin. The JavaScript files are directly maintainable source; no additional compilation is required. Plugin-specific prompts and labels are currently primarily Chinese.

## Capabilities

- Official conversation components for streamed replies, Markdown, reasoning/tool presentation, images/files, `+`, `@`, `/`, model/permission selection, submission, queues and stopping.
- Separate side histories and drafts per main conversation, using the official right-pane lifecycle, scrolling and resizing.
- Read-only `side_main_read` for the bound main's activity, messages, trajectory and events, with search, fixed-snapshot pagination and chunked long-event reads.
- Stopping either Agent does not stop the other. No “send to main conversation” action or delivery endpoint exists.
- Reconnects the history subscription after a disconnect and lets official state machines catch up and deduplicate. Persistent failures show a reconnect action; user prompts are not resent.

Reusing official components is not a claim that every third-party tool or future official feature has been tested.

## Install, upgrade and uninstall

### Method 1: paste the package URL directly (recommended)

Confirm DSH Desktop is `0.2.0-rc.2`, then open **Plugins → Add plugin** in the left sidebar. Paste the complete line below into **Package name or address**:

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/session-panel-v2.4.0-dsh020rc2.9/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

1. Keep the default, official npm or Mainland China registry. This selects the npm download source, which dependencies may still use. **Do not put the URL above into Registry / Custom address.**
2. Click **Install**, wait for completion and confirm `@dsh-local/session-panel` is enabled in the installed list.
3. Save drafts and wait for active tasks to finish. Fully quit using the application menu's **Exit/Quit** or the tray's **Quit**, then reopen DSH. Refreshing may reuse the old injection manifest and produce resource 404 errors; the window's close button may only hide the window.
4. Choose **侧边会话** from the right-hand **Start** page. If collapsed, use the official right-pane toggle or `Ctrl + Alt + B`.

No manual download or extraction is needed first. This URL points to a single-plugin Release asset, not the entire repository.

### Method 2: download first, then install the local file

Download `dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz` from the [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) Assets. **Do not extract it.** For example, after saving it yourself in `D:/DSH-plugins/downloads`, enter this in the same **Package name or address** field:

```text
file:D:/DSH-plugins/downloads/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

Replace the example with its actual location, including the filename, without quotes. Then follow Method 1's install, enable, full quit and entry-opening steps.

### Method 3: install the single-plugin directory from the repository

Download and extract the repository, locate `plugins/session-panel` and confirm it directly contains `package.json`, `cordis.patch.yml` and `lib`. For a checkout at `D:/DSH-plugins/my-dsh-plugins`, enter this in **Package name or address**:

```text
D:/DSH-plugins/my-dsh-plugins/plugins/session-panel
```

The example directory must actually exist; do not paste it without adjusting it. Do not select the repository root or parent `plugins` directory; the root is not an installable Bundle. Retain a directory used for local installation so its source remains available.

### Troubleshooting

- **“Path does not exist or is not a valid plugin package”**: confirm the absolute local path exists. The directory must directly contain the plugin manifest, not a collection of packages. Use the Windows forms above as examples.
- **GitHub URL installation fails**: download the standalone `.tgz` in your browser and use Method 2. Changing the npm mirror does not provide a GitHub download proxy.
- **Package name is not found**: this version is not published to npm. `@dsh-local/session-panel` identifies the package; use its standalone asset URL or a local path.
- **Repository URL or Source code archive entered**: the whole repository, a GitHub `tree/...` page and generated Source code archives are not installation entries for this plugin. Use the Release's standalone `.tgz` or Method 3's single-plugin directory.
- **Missing entry or resource 404 after installation**: check enabled status and the DSH version, save drafts, wait for tasks to finish, fully quit/reopen and expand the right pane. Do not delete conversations or clear account data.

See the [official plugin-manager documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md) for install-address forms. Download and installation depend on your network, file paths and DSH version.

### Upgrade and uninstall

For upgrades, use the current official plugin-management flow to disable/uninstall the old package and install the new one. Do not delete session logs, clear account settings or disable unrelated plugins. Removing the plugin is not the same as removing DSH-managed history; use official data-management tools and back up first if deletion is intended.

The plugin installs independently without patching DSH core or requiring another model key. It uses DSH's configured models and permissions; model calls remain subject to the provider's billing rules.

## Usage examples

Open Session Panel within a main conversation and ask, for example:

> What stage is the main task at? Use its execution trajectory to explain recently completed work and separate confirmed facts from inference.
>
> What does this technical term in the main conversation mean? Explain it for a beginner in the context of the current task.
>
> Summarize the purpose and result of the main conversation's most recent tool call using read-only access. Clearly state if no result has arrived yet.

Each main conversation has its own side session. Switching the main conversation switches to its associated side history and draft. The side Agent can also perform separate authorized tasks; its main-observation interface remains read-only.

## Data and permissions

- DSH persists the session history; the package and browser localStorage do not store chats. Stable namespaces derive a side-session identity from each main conversation.
- Older per-main depth-one side sessions can migrate using the official inherited-prefix contract into hidden, independent depth-zero roots. Old logs are retained; running legacy Agents or invalid identities stop migration rather than forcing an overwrite.
- History migration covers older per-main side sessions only. Early singleton-mode history migration is not supported.
- Automatic main context contains the latest 36 messages, 20 steps and 24 event summaries. Tool summaries are capped at 1200 characters; step summaries at 160. The read-only tool retrieves older records in pages of up to 30 or long-event chunks of up to 12000 characters. Pin a snapshot within one pagination pass; acquire a fresh snapshot to inspect newly added progress.
- The old summary endpoint's 240-entry cap does not delete durable history. Model context is still constrained by official windows and compaction; unavailable or unrecorded content cannot be recovered magically.
- While the main task runs, a tool-category guard pauses potential conflicts. Explicit authorization applies to the current side task and expires on idle. Tool-name checks and instructions are not a security sandbox; unknown tools and general terminals still require care.
- Main records enter the selected side model's context. There is no added telemetry or separate cloud backend, but the plugin cannot guarantee a model provider's privacy practices. Never post credentials, private logs or unredacted session screenshots to public Issues.

## Compatibility and limitations

- This version supports only DSH Desktop `0.2.0-rc.2`. It uses some internal Controller interfaces; confirm compatibility before upgrading DSH.
- Plugin-specific prompts and labels are primarily Chinese. Bilingual documentation does not mean the interface is fully localized.
- Offline regression and disconnect fault-injection checks do not validate every native network interruption, third-party tool or future DSH release.
- After first installation, send a short message and switch between two main conversations to check history and draft isolation. Do not deliberately disconnect the network during important tasks.

See the [release and validation notes](../../docs/release-checks/session-panel.md) for version provenance and the scope of manual acceptance and automated checks.

## Feedback

Report bugs or request features through [GitHub Issues](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues). Include the DSH version, plugin version, reproduction steps, expected and actual behavior, and any necessary redacted screenshots. Do not upload keys, account configuration or complete session files. Read [SECURITY.md](../../SECURITY.md) before reporting a security issue.

## License

This plugin is licensed under the [MIT License](LICENSE). See [NOTICE.md](NOTICE.md) for upstream attribution and licensing, and [CHANGELOG.md](CHANGELOG.md) for version history.
