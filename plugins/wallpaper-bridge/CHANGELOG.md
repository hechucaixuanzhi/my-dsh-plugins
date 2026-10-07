# Changelog / 更新记录

## 0.3.6-dsh020rc2.1 — 2026-10-07 (prerelease / 预发布)

### 中文

- 首次以独立插件进入本仓库，公开名称改为 DSH 壁纸桥 / DSH Wallpaper Bridge。
- 保留 `@dsh-local/we-skin`、Bundle 行 ID、设置 ID、路由和配置位置，避免名称变更造成配置迁移。
- 仅包含活跃前端和必需 Host 模块；排除旧前端、私人路径、备份、测试日志、配置、依赖与壁纸素材。补齐双语安装指南、MIT 及社区来源声明。
- 适配目标标为 Windows DSH Desktop `0.2.0-rc.2`；保留桌面短轮询与回环视频请求。
- 加强网页壁纸隔离，限制插件 HTTP 路由到本机，防止跨站设置写入和符号链接越界；修正视频后缀 Range、越界终点与 HEAD 响应。
- 增加合成数据离线测试与两个独立安装包的自动检查。公开包的原生多类型/多显示器验收尚未完成，因此不宣称稳定全场景支持。

### English

- First independent release in this repository, publicly named DSH Wallpaper Bridge / DSH 壁纸桥.
- Preserve `@dsh-local/we-skin`, Bundle row ID, settings ID, routes and configuration locations to avoid name-driven migration.
- Include only the active client and required Host modules. Exclude the legacy client, personal paths, backups, test logs, configuration, dependencies and wallpaper assets; add bilingual installation guidance, MIT and community attribution.
- Target Windows DSH Desktop `0.2.0-rc.2`; retain Desktop polling and loopback video requests.
- Isolate web wallpapers, limit plugin HTTP routes to the local machine, reject cross-site settings writes and escaping symlinks; correct suffix Range, oversized endpoints and HEAD responses.
- Add synthetic offline tests and checks for both independent packages. Native wallpaper-type/multi-monitor acceptance of the public package remains incomplete; this is not a universal stability claim.
