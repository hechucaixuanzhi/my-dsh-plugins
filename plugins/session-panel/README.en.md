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

Install forms follow the [official plugin-manager documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md) and were checked against the installed `0.2.0-rc.2` spec parser. This does not mean an installation was performed on your behalf in this documentation update.

### Upgrade and uninstall

For upgrades, use the current official plugin-management flow to disable/uninstall the old package and install the new one. Do not delete session logs, clear account settings or disable unrelated plugins. Removing the plugin is not the same as removing DSH-managed history; use official data-management tools and back up first if deletion is intended.

No dependency on SillyTavern, wallpaper or pet plugins, no core patches, and no extra model key. Compatibility is pinned to `0.2.0-rc.2`; a few internal Controller interfaces require revalidation after DSH upgrades.

## Data and permissions

- DSH persists the session history; the package and browser localStorage do not store chats. Stable namespaces derive a side-session identity from each main conversation.
- Older per-main depth-one side sessions can migrate using the official inherited-prefix contract into hidden, independent depth-zero roots. Old logs are retained; running legacy Agents or invalid identities stop migration rather than forcing an overwrite.
- This public package removes a development-machine-specific legacy singleton identifier. That singleton is outside public migration support. Deterministic per-main migration and metadata-based side-session checks remain.
- Automatic main context contains the latest 36 messages, 20 steps and 24 event summaries. Tool summaries are capped at 1200 characters; step summaries at 160. The read-only tool retrieves older records in pages of up to 30 or long-event chunks of up to 12000 characters. Pin a snapshot within one pagination pass; acquire a fresh snapshot to inspect newly added progress.
- The old summary endpoint's 240-entry cap does not delete durable history. Model context is still constrained by official windows and compaction; unavailable or unrecorded content cannot be recovered magically.
- While the main task runs, a tool-category guard pauses potential conflicts. Explicit authorization applies to the current side task and expires on idle. Tool-name checks and instructions are not a security sandbox; unknown tools and general terminals still require care.
- Main records enter the selected side model's context. There is no added telemetry or separate cloud backend, but the plugin cannot guarantee a model provider's privacy practices. Never post credentials, private logs or unredacted session screenshots to public Issues.

## Acceptance and limitations

Basic manual acceptance passed on `.8`: main-trajectory explanation, images/`@`/`/`, history/draft isolation, close/reopen, scrolling/resizing, reply presentation and bidirectional stop isolation. `.9` prepares the public release: unchanged client behavior, removal of an installation-specific identifier, and publication metadata/documentation. The public copy receives separate regression checks; `.8` manual evidence is not presented as exhaustive `.9` runtime validation.

Recovery has offline fault-injection evidence using the actual official state machines, not exhaustive validation of every native network interruption. After installation, send a short message and check drafts across two main conversations. Do not disconnect the whole machine during important tasks just to test recovery.

See the [release checks](../../docs/release-checks/session-panel.md). Report DSH/plugin versions, reproduction steps and redacted screenshots, not configuration directories or real session files.

License: [MIT](LICENSE). Attribution: [NOTICE.md](NOTICE.md). Updates: [CHANGELOG.md](CHANGELOG.md).
