# Tavern Bridge release checks / 酒馆桥发布检查

## 0.3.1-dsh020rc2.1 — 2026-10-14

- New behavior / 新行为：sharing consent includes installation of the local Tavern helper and current-user connection updates through Tavern's native APIs. Startup issues an expiring single-use handoff; the helper saves endpoint/key/model/auto-connect and connects without a manual Connect click. / 共享授权包含本机扩展安装及当前用户连接更新，启动后自动配置并连接。
- Recovery / 恢复：prior connection fields and Custom secret ID are saved locally before changes; old native secrets remain. Extension code updates retain `.bak` files, reject unknown/local edits and check for concurrent changes. / 保留旧连接与旧密钥，扩展更新备份并检查改动。
- Security / 安全：handoff requires Tavern Origin, expires after two minutes and is consumed before async work; its token cannot access model endpoints. Persistent gateway keys are absent from URL/source/state. / 限定来源、时效和一次性，不在公开产物中保存真实密钥。
- New synthetic coverage / 新增合成验证：token expiry/replay/origin, empty catalog, native save failure, key deduplication, model fallback, extension integrity/symlink refusal, reused startup and version mismatch.
- Real Tavern browser / 真实酒馆浏览器：disposable SillyTavern 1.19.0 with a fake DSH model service and real headless browser verified first-open, same-document reopening and ordinary reload without a Connect click, persisted auto-connect/endpoint/key, previous connection snapshot, and no duplicate gateway key. Only Tavern's own first-run welcome dialog was acknowledged. No real user data or model generation requests. / 独立临时副本与合成模型验证，未操作真实用户数据或付费模型。
- Final regression / 最终回归：**108 passed, 0 failed, 0 skipped**, with installed DSH method contracts and the optional real Tavern browser test enabled. Portable default run: **86 passed, 3 optional suites/tests skipped** (not counted as passes). / 含已安装方法及真实酒馆浏览器验证 108 项通过；默认便携模式明确保留跳过项。
- Scope / 范围：auto-connect requires enabled Tavern extensions and version 1.19.0. Native DSH Desktop installation/rendering and paid model generation remain **NOT RUN**; this remains a prerelease. / 原生 DSH 安装及真实付费生成仍未运行，保持预发布。

## Historical evidence: 0.3.0-dsh020rc2.1 — 2026-10-13

Target / 适配目标: Windows DSH Desktop `0.2.0-rc.2`, separately preinstalled SillyTavern `1.19.0`.

本记录仅描述公开副本。个人版运行记录、旧网关真实调用记录，不等于此公开版验收。 / Public-copy scope only: personal-version usage and old-gateway calls are not acceptance of this version.

| Check / 检查 | Scope and result / 范围与结果 |
| --- | --- |
| Bundle | Standalone package, preserved identity/row, exact target version, explicit files, no install scripts/dependencies bundled / 独立包、保留身份、明确版本、精确文件清单，无安装脚本或依赖内嵌 |
| Redaction / 脱敏 | Public source and actual archive scanned; no copied credential/provider configuration, personal paths, logs, roles, worlds, chats, screenshots, launch scripts or test environments / 扫描公开源码和实际包，不复制私人数据 |
| Gateway / 网关 | Official DSH llm service, explicit sharing consent, loopback/key/Host/Origin checks, request bounds/concurrency, cancellation, separate reasoning, visible errors, no extra paid retry / 官方服务与受限本机网关 |
| Launcher / 启动 | Preinstall required; mock child processes prove reuse, concurrent-click deduplication, timeout/exit handling and no shell/npm/force-kill / 预装前提、模拟启动和失败边界 |
| File editing / 文件编辑 | Bilingual optional user-reviewed rules; exact target authorization, backup, concurrency, validation/reload; no arbitrary file-write HTTP route / 仅规范与既有 DSH 文件工具，不增加任意文件写入端点 |
| Installed contracts / 已安装接口 | Optional actual installed catalog/stream entry methods with synthetic registrations, plus carrier slot presence; no credentials, real models or app boot / 使用实际方法与合成依赖，不读取密钥或启动应用 |
| Native acceptance / 原生验收 | Fresh package install, settings/right-pane rendering, real SillyTavern Connect/stream/cancel and file-edit round trip **NOT RUN / 尚未运行** |

## Verification evidence / 验证依据

- Local pre-publication regression: **97 passed, 0 failed**, including **40 Tavern Bridge checks** (four installed-method checks). / 本地发布前回归 97 项全部通过，酒馆桥 40 项，其中 4 项使用已安装方法。
- Without optional archives: **76 passed, two suites skipped**, explicitly not claimed passed. / 无可选归档时 76 项通过、两个套件明确跳过，不算通过。
- Public allowlist, bilingual docs/version gates and actual npm archive content checks: **PASS**. / 公开白名单、双语文档/版本检查与实际安装包内容检查通过。

- Automated tests use only synthetic messages, generated test keys, isolated temporary files and loopback ports. / 自动测试只用合成数据、临时生成密钥、隔离临时文件与回环端口。
- Without DSH_ASAR, installed-contract suites explicitly skip; a skip is not a pass. / 未提供本机归档时明确跳过相关测试，不算通过。
- Package inspection compares every npm archive member with the reviewed public source and repeats allowlist/sensitive-pattern checks. It does not prove perfect secret detection or native behavior. / 包内逐文件比对与再次扫描不能替代人工审核和原生验收。
- Private providers.json, credential stores and Tavern configuration were not read/copied into public files, and no paid model calls were made. The live private plugin and old gateway remain untouched. / 未读取或复制真实提供方配置、凭据、酒馆配置，未发起付费调用，运行版未替换。

## User acceptance checklist / 用户验收清单

1. Install Tavern/Node/dependencies first. Install the released tgz into supported Desktop, save drafts/wait, fully reopen; configure the absolute directory under Settings → DSH 酒馆桥. / 先安装酒馆，再装插件、重开并填写目录。
2. Click the right-pane Tavern entry with Tavern running: reuse it. Later, when safe, stop only the user-owned Tavern process and test cold startup. Verify visible errors for a bad directory/occupied port without changing real data. / 检查复用；安全时再检查冷启动及错误提示。
3. Sharing remains off until explicitly enabled. Prefer a new unoccupied gateway port if the legacy gateway is running. Enter the displayed Base URL/local key into Tavern's Custom connection, Connect, verify a model you authorize, then optionally test one short paid reply/stream and cancellation. / 明确授权共享后检查连接；真实模型测试需用户主动确认费用。
4. Use a disposable test world book or preset in a separate test data copy. Authorize one field, verify backup/validation/reload and rollback. Never use private work/chat for public evidence. / 用隔离测试数据验证指定字段编辑、备份、刷新和恢复。
5. Close the pane while startup waits, reopen, and confirm no late/wrong tab. Disable the public plugin and confirm only its gateway stops; do not stop the legacy gateway or unrelated DSH tasks. / 验证关闭、重开与生命周期隔离。

Publish as a prerelease until native checks are completed. Store only sanitized outcomes here; never post local keys, private configuration or complete logs. / 原生验收前仅预发布，本记录只保存脱敏结果。
