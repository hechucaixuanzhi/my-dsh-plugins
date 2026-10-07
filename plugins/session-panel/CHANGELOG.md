# Changelog / 更新记录

## Unreleased documentation / 未打包文档更新 — 2026-10-07

### 中文

- 按桌面版「添加插件」界面补齐直接安装包地址、本地 `.tgz` 和单插件目录三种方式，提供可复制的 Windows 示例。
- 说明包名输入框与 npm 安装源的区别、未发布 npm 的状态、完整退出重开及常见安装错误。
- 按开源项目的读者需求重整中英文首页和插件文档，补充使用示例与反馈入口；详细维护规则保留在贡献指南，历史验收细节保留在发布检查记录。
- 同步中英文总 README 和插件 README；仅更新仓库文档，不修改运行时代码、版本或已发布 `.9` 安装包。

### English

- Expanded Desktop's Add plugin instructions with a direct package URL, a local `.tgz` and a single-plugin directory, including copyable Windows examples.
- Clarified the package field versus npm registry, unpublished npm status, full quit/reopen and common installation errors.
- Reorganized both language editions of the project and plugin guides for open-source users, adding usage examples and feedback links. Detailed maintenance rules stay in the contribution guide; historical acceptance details stay in release checks.
- Synchronized both root and plugin READMEs. Repository documentation only; no runtime changes, version bump or replacement of the published `.9` package.

## 2.4.0-dsh020rc2.9 — 2026-10-07

### 中文

- 首个独立开源安装包，固定适配 DSH Desktop 0.2.0-rc.2。
- 在已完成基础人工验收的 `.8` 上整理发布；客户端保持不变。
- 删除开发机特有的旧单例会话 ID 守卫。仍通过 Session 元数据拒绝侧会话作为主对话，保留按主对话派生的迁移；不发布或迁移该私有旧单例。
- 删除私人路径、诊断记录和测试环境引用；补齐 MIT、上游声明、双语说明与明确打包清单。
- 加入仓库双语 README 同步门禁、可移植测试及发布检查。

### English

- First standalone public package, pinned to DSH Desktop 0.2.0-rc.2.
- Prepared from `.8`, which passed basic manual acceptance; the client is unchanged.
- Removed the development-machine-specific legacy singleton ID guard. Session metadata still rejects side sessions as mains; per-main migration remains. The private legacy singleton is neither distributed nor covered by public migration.
- Removed personal paths, diagnostic history and private test-environment references; added MIT licensing, upstream attribution, bilingual guides and an explicit package allowlist.
- Added bilingual root README synchronization checks, portable tests and release-review documentation.
