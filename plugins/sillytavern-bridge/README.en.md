# DSH Tavern Bridge / DSH 酒馆桥

[中文](README.md) | English

Open local SillyTavern from DeepSeek Harness's right pane, optionally reuse DSH models through a protected local gateway, and let DSH help edit configuration, presets and world books in an explicitly authorized Tavern workspace.

An independent community integration, not an official DeepSeek or SillyTavern product. No Tavern application, character cards, chats, private configuration, secrets or personal gateway configuration are bundled.

## Version and prerequisites

- Plugin `0.3.0-dsh020rc2.1`, first public prerelease; internal name remains `@dsh-local/sillytavern-bridge`.
- Target: Windows DSH Desktop **`0.2.0-rc.2`**, local SillyTavern **`1.19.0`**. Other versions are unverified; neither application is automatically upgraded.
- **Download/install SillyTavern and Node.js 24 first, including Tavern's dependencies.** Its directory must contain server.js, package.json and node_modules/. Follow the [official Windows guide](https://docs.sillytavern.app/installation/windows/) and obtain an appropriate version from [official releases](https://github.com/SillyTavern/SillyTavern/releases).
- Enable DSH's right-pane Browser plugin. Confirm ordinary DSH chat and standalone Tavern work first.
- This plugin never downloads Tavern, runs npm install or Start.bat, upgrades applications or changes Tavern's network whitelist.

## Capabilities and boundaries

| Capability | Implementation and limits |
| --- | --- |
| One-click entry | Right pane → Start → 酒馆 checks/starts the preinstalled service, then opens the official Browser tab. Concurrent clicks share startup; occupied ports, timeout and failure show errors/retry |
| DSH model API sharing | Explicit opt-in starts a loopback-only, locally authenticated OpenAI-compatible gateway. It reads DSH's current registered provider/model catalog; DSH's official model service handles credentials and requests, without parsing/copying credential files |
| DSH edits Tavern files | Add Tavern as a DSH workspace and authorize the exact task. Existing DSH tools edit the chosen configuration, preset or world book. Bilingual rules are provided; no general file-writing HTTP API is added |

**Not a full Tavern port or live bidirectional synchronization.** It does not automatically inspect the selected character, merge DSH and Tavern chat, or guarantee disk changes immediately appear in an open page.

## Install the plugin

1. Install Tavern and Node as above, then open DSH's left sidebar → **Plugins → Add plugin**.
2. Paste the complete URL below into **Package name or address**, **not Registry / Custom address**:

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/sillytavern-bridge-v0.3.0-dsh020rc2.1/dsh-local-sillytavern-bridge-0.3.0-dsh020rc2.1.tgz
```

3. Keep the default registry; it controls npm dependencies, not the GitHub URL.
4. Confirm `@dsh-local/sillytavern-bridge` is enabled. Save drafts, wait for tasks, fully quit DSH and reopen it.
5. Open **Settings → DSH 酒馆桥**. Enter Tavern's **absolute installation directory**, Node executable and Tavern/gateway ports; click Save. No drive-specific default or private-directory scanning is used.
6. Open **Start → 酒馆** in the right pane. Press `Ctrl + Alt + B` if collapsed.

### Local package or source directory

Download the standalone `.tgz` from the [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/sillytavern-bridge-v0.3.0-dsh020rc2.1), without extracting it. Enter its actual absolute path in the same input, for example:

```text
file:D:/DSH-plugins/downloads/dsh-local-sillytavern-bridge-0.3.0-dsh020rc2.1.tgz
```

A checkout's single-plugin directory, such as `D:/my-dsh-plugins/plugins/sillytavern-bridge`, is also usable. The whole repository URL, root directory, plugins parent and generated Source code archives are not standalone plugin installation sources. This package is not on npm; its name alone cannot download it.

## Share DSH models

1. Configure and verify the required models in DSH. Enable sharing only on a trusted local machine; model calls follow provider billing rules.
2. Explicitly enable model sharing in plugin settings. Optionally enter comma-separated provider IDs. Empty means all currently registered providers' listed models; enter an exact DSH provider ID to restrict sharing.
3. Save, then reopen the Tavern entry. The gateway starts with the entry, using **port 8100 by default, bound only to loopback**. Choose another 1024–65535 port if needed, different from Tavern's port.
4. Obtain the generated **Base URL** and **local gateway key** from settings. This independent random access key is **not a provider API key**. It is returned only after explicitly revealing it, never in ordinary state responses.
5. In Tavern choose **Chat Completion → Custom (OpenAI-compatible)**, enter that Base URL and local key, then Connect to refresh models. IDs use `provider/model`.
6. After changes to DSH's registered model configuration, reconnect Tavern to refresh the catalog. DSH still owns credentials/endpoints. Catalog presence does not prove that authentication, quota or account policy permits a call.

Initial connection fields require manual entry or separate authorization for DSH to edit those exact fields. The plugin **never silently overwrites** Tavern connection settings or copies real provider keys into them.

### Compatibility limits

- Text Chat Completions only: JSON/SSE; system/developer/user/assistant messages; max_tokens, temperature, stop and reasoning_effort; visible content and reasoning_content remain separate. Developer messages map to ordered DSH system messages.
- Calls use the official DSH model adapters, not the old standalone gateway's handwritten providers.json. Manual overrides are not migrated automatically; configure those providers/models in DSH.
- Images, audio, files, tool calling, multiple candidates, Embeddings and Responses API are not provided. Unsupported content errors instead of being silently dropped as text.
- Extra sampling fields such as top_p, top_k, seed, penalties and logit_bias are not mapped: this is not full OpenAI API compatibility. Reasoning levels, account-login models and provider behavior depend on DSH and remain unverified with live calls in this public version.
- Reasoning-only/empty visible output produces an explicit error. **The plugin adds no automatic paid retry**; DSH/provider retry policies may still apply. Limits: 2 MiB request body, 8 MiB output, four concurrent model requests and a default 180-second request timeout.
- DSH must remain running for this integrated gateway. Disabling the plugin/quitting DSH closes its gateway and cancels its requests, without closing other gateways or forcibly killing Tavern.

## Let DSH edit configuration, presets and world books

Add the Tavern installation directory as a DSH workspace. In each conversation identify the work/character and exact task, for example:

> Read-only: inspect this character's related world book and preset, report the current state, and do not modify files or read secrets.
>
> I authorize only the confirmed files/fields. Back up first and coordinate any unsaved UI state; then edit, validate, and explain reload/restoration steps.

View the editing guide in settings or read [WORKSPACE.en.md](WORKSPACE.en.md). Review and merge it manually into existing AGENTS.md; **do not overwrite existing rules**. Instructions are not an OS permission boundary. Global config.yaml, settings.json and connection settings differ in scope from ordinary world books: authorize exact fields separately. PNG character cards must not be edited as text.

An open Tavern page may keep a stale copy and overwrite disk on save. Back up, check concurrent changes, reread/validate after editing, then ask the user to refresh and verify. Only generic rules are published, never your works, characters or configuration.

## Configuration, upgrades and troubleshooting

- Plugin directory/port settings: DSH_HOME/storages/sillytavern-bridge/config.json. Its local key is separate in gateway-auth.json, not ordinary configuration. Default DSH_HOME is .dsh under the user's home. File mode on Windows is not full ACL isolation: protect the local account and directory permissions.
- Saving closes this plugin's gateway; the next Tavern-entry click starts it again. Active model calls block saving. Do not change these settings during chat.
- An old standalone gateway occupying 8100 is never adopted, terminated or stripped of authentication. Choose another plugin gateway port and update Tavern's Base URL, or manage the old service yourself.
- For startup failure check directory/dependencies and Node's executable, then start Tavern manually for diagnostics. The plugin discards service stdout/stderr to avoid accidentally retaining private content.
- Readiness targets the normal HTTP Tavern homepage. HTTP Basic Auth, HTTPS or a modified page title may safely be treated as unready; these configurations are not claimed compatible. Do not disable existing safeguards to install this plugin.
- Right-pane display targets official Desktop, not a remote Web iframe. Phone access is Tavern's own LAN configuration. The plugin changes no firewall, listener or whitelist and exposes no model gateway to phones or the internet.
- DSH currently has no plugin auto-update. Disable/uninstall the old version, install the new one and fully quit/reopen after saving drafts and waiting for tasks. Never delete Tavern data, chat history or unrelated plugins.
- The Tavern child may remain after DSH exits; it is detected and reused later. Timeout neither force-kills it nor starts a duplicate while that child is still alive.

## Security and validation

Sharing is off by default and requires a random local key. Loopback, Host and browser-Origin checks apply, with no wildcard CORS. Plugin settings/start requests use authenticated DSH Connection. No direct DSH credential-file reads, added telemetry, request-body logging or raw provider-exception logging occur. This is not an OS sandbox: a local-user process or holder of the local key may still use models.

Public files and packages require allowlist checks, sensitive-pattern scanning and human review; see [release checks](../../docs/release-checks/sillytavern-bridge.md). Offline tests use synthetic data/temporary loopback ports, not real keys, model requests or Tavern data. Optional tests execute public methods from an installed official archive with synthetic dependencies, not native Desktop acceptance.

**Fresh installation, real right-pane/settings interactions, Tavern Connect, generated text, streaming, cancellation and the editing workflow still need native acceptance. This is a prerelease.** Live model tests may cost money and require the user's deliberate action. Report [redacted Issues](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues), never secrets, entire configuration folders, private characters or chats.

## License and provenance

Bridge code/templates use the [MIT License](LICENSE); see [NOTICE.md](NOTICE.md). Neither application nor their dependencies are distributed. SillyTavern itself retains [AGPL-3.0](https://github.com/SillyTavern/SillyTavern/blob/release/LICENSE). This plugin is independent of Session Panel, Wallpaper Bridge and pets.
