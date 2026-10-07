# Wallpaper Bridge release checks / 壁纸桥发布检查

## 0.3.6-dsh020rc2.1 — Windows DSH Desktop 0.2.0-rc.2

中文：本记录说明公开副本的检查范围，不包含用户机器标识、配置、路径、会话、测试日志或壁纸内容。以预发布形式提供；本机旧版使用记录不等同于新公开版原生验收。

English: This records the public-copy check scope, without machine identifiers, configuration, paths, sessions, test logs or artwork. Published as a prerelease; previous local-version usage is not native acceptance of this public copy.

发布前本地结果 / Local pre-publication results (2026-10-07):

- 仓库离线回归 / Repository offline regression: **56 passed, 0 failed**, including 14 Wallpaper Bridge tests and the opt-in Session Panel installed-state-machine suite. Loading the official archive does not launch DSH or validate native wallpaper rendering. / 包含壁纸桥 14 项与侧聊官方状态机可选测试；读取官方归档不等于启动 DSH 或验证原生壁纸渲染。
- 公开白名单、常见敏感模式、双语文档和版本门禁 / Public allowlist, common sensitive patterns, bilingual docs and version gate: **PASS**.
- 实际 tgz 逐文件与公开源码比对、再次脱敏扫描 / Actual tgz exact source comparison and redaction rescan: **PASS**, 12 regular files, no bundled dependencies or installation hooks. / 共 12 个常规文件，无依赖内嵌或安装钩子。
- CI 未提供官方归档时，相关状态机套件明确跳过；不要把此跳过当作通过。 / CI explicitly skips the official state-machine suite without an archive; a skip is not a pass.

| Check / 检查 | Scope / 范围 |
| --- | --- |
| Public files / 公开文件 | Active client, five Host/client JS files, Bundle and bilingual documents only; no legacy shell/client, user config, assets, dependencies or logs |
| Compatibility / 兼容声明 | Exact target `0.2.0-rc.2`; package retains `@dsh-local/we-skin`, original Bundle row and config namespace |
| Privacy / 脱敏 | Explicit file allowlist and common-secret/path scanner on public source and actual package; human review of included files; no claim of perfect secret detection |
| License / 许可 | Original MIT retained; community reference commit/license checked; no Wallpaper Engine or Workshop artwork redistributed |
| Offline tests / 离线测试 | Synthetic Desktop/Web loader and cleanup, settings normalization, local-route/CSRF boundaries, file traversal/junction boundaries, video ranges/HEAD, scene image parsing; no real accounts, model calls or wallpaper files |
| Package / 安装包 | Independent `.tgz` with explicit files; no installation scripts or bundled dependencies; archive content checked against public files |
| Native Desktop / 原生桌面 | Public package fresh install, real image/video/web/scene behavior, layout interaction and multi-monitor scenarios **NOT RUN / 尚未运行** |

## Manual acceptance still required / 待人工验收

1. Windows DSH Desktop `0.2.0-rc.2`: install the released tgz, fully reopen DSH, find Settings → DSH 壁纸桥. / 安装发布包并重开，确认设置入口。
2. Apply an image, supported video, trusted web wallpaper and scene in WE. Check switching, playback and the documented static-scene fallback. / 分别检查图片、视频、可信网页、场景及切换；场景静态回退应与文档一致。
3. Save per-wallpaper view settings, reopen, switch wallpapers and restore defaults; confirm other plugins and right pane still work. / 验证保存、重开、切换和恢复默认，不影响其他插件及右栏。
4. Confirm first-monitor behavior on multiple monitors; do not claim window-following monitor selection. / 多屏确认当前首个显示器行为，不将其当作按窗口选屏。

Only sanitized summaries belong here. Keep personal configuration, screenshots and copyrighted wallpaper fixtures outside the repository. / 本记录只保存脱敏结论；私人配置、截图与受版权保护壁纸不得进入仓库。
