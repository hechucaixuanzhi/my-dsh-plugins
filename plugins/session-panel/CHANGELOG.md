# Changelog / 更新记录

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
