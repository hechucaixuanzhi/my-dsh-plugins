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

1. Download `dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz` from the [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9).
2. In **Plugins → Add plugin**, enter `file:<absolute-path-to-downloaded-file>`. Alternatively, select the absolute local directory of `plugins/session-panel` in this repository. Do not select its parent or install the entire repository as one plugin.
3. After enabling, save drafts and wait for running tasks to finish, then fully quit and reopen DSH. A page refresh may reuse the old injection manifest and produce resource 404 errors.
4. In the right-hand **Start** page choose **侧边会话**. If the whole right pane is collapsed, use its official toggle or `Ctrl + Alt + B`.

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
