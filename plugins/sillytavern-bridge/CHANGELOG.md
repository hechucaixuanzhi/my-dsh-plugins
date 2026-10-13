# Changelog / 更新记录

## 0.3.0-dsh020rc2.1 — 2026-10-13 (prerelease / 预发布)

### 中文

- 首个公开版，展示名称 DSH 酒馆桥 / DSH Tavern Bridge；保留包名与 Bundle 行 ID。
- 从个人版一键启动入口整理，新增可配置目录、Node 和端口、设置入口与可选模型共享；不打包或自动安装 SillyTavern。
- 网关改用 DSH 官方 llm 服务，而非解析私人凭据、固定安装路径和 providers.json。认证和实际模型请求由 DSH 提供方处理。
- 共享默认关闭；本机回环、随机访问密钥、Host/Origin 检查、请求限制与取消；不沿用旧网关通配跨域、无访问密钥或额外空正文付费重试。
- 增加授权文件编辑的中英文工作区规范；保留备份、并发检查、校验与页面重新加载边界，不增加通用文件写入接口。
- 声明目标 DSH Desktop 0.2.0-rc.2 / SillyTavern 1.19.0；添加合成离线与已安装官方方法契约测试。原生安装/真实调用仍需用户验收，不宣称稳定全场景支持。
- 排除个人配置、凭据、角色、世界书、聊天、启动脚本、备份、日志、旧网关测试及依赖；补齐双语安装与开源来源说明。

### English

- First public release, displayed as DSH Tavern Bridge / DSH 酒馆桥; preserve the package name and Bundle row ID.
- Adapt the personal one-click launcher with configurable directory, Node/ports, settings UI and optional model sharing; do not bundle or automatically install SillyTavern.
- Replace private credential parsing, fixed paths and providers.json with DSH's official llm service. DSH providers own authentication and model requests.
- Sharing off by default; loopback-only random-key authentication, Host/Origin checks, limits and cancellation. Do not retain wildcard CORS, anonymous model access or extra paid retries on empty output.
- Add bilingual authorized-editing workspace rules, preserving backup/concurrency/validation/reload boundaries; no generic file-writing API.
- Target DSH Desktop 0.2.0-rc.2 / SillyTavern 1.19.0. Add synthetic tests and opt-in installed-method contract checks. Native installation/live calls remain pending, not universal stability claims.
- Exclude personal configuration, credentials, characters, world books, chats, launch scripts, backups, logs, old gateway experiments and dependencies; add bilingual install/provenance documentation.
