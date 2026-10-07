# DSH 壁纸桥 / DSH Wallpaper Bridge

中文 | [English](README.en.md)

将本机 Wallpaper Engine 的当前壁纸显示在 DeepSeek Harness 中，并根据壁纸调整界面配色、透明度和毛玻璃效果。

社区独立项目，非 DeepSeek、Steam 或 Wallpaper Engine 官方产品。原内部包名 `@dsh-local/we-skin` 保留，名称变更不会更换配置命名空间。

## 版本与要求

- 插件：`0.3.6-dsh020rc2.1`，首个公开预发布版。
- 适配目标：**Windows 上的 DSH Desktop `0.2.0-rc.2`**。不声明兼容其他 DSH 版本。
- 本机已安装 Wallpaper Engine，并已应用一个壁纸。不需要额外模型密钥，也不发起模型请求。
- 插件是壁纸桥接和界面主题工具，不是 Wallpaper Engine 渲染器或桌面录屏工具。

## 支持什么

| 壁纸类型 | 显示方式与限制 |
| --- | --- |
| 图片 / GIF | 浏览器支持的格式直接显示 |
| 视频 | 浏览器支持的格式循环播放，默认静音；能否解码取决于 DSH 的 Chromium |
| 网页 | 隔离 iframe 中运行，注入默认壁纸属性与有限 API 占位；不支持完整 WE API，依赖同源访问、联网请求或高级 API 的壁纸可能失效 |
| 场景 `scene.pkg` | 从包中寻找内嵌 PNG/JPEG；不可用时显示预览图。**不运行场景动画、粒子、灯光、音频响应或 3D 特效** |

提供铺满、完整显示、原始尺寸、拉伸、0.25–4× 缩放、横纵焦点、透明度、模糊、配色强度及切换过渡。显示参数按壁纸 ID 保存，可单独恢复当前壁纸的默认显示参数。

当前从配置中选择首个有效 `MonitorN` 壁纸；**没有完成按 DSH 窗口自动选择显示器的功能**。不应将历史配置里的 `monitorMode` 当成已支持的 UI 功能。

## 安装、升级与卸载

### 推荐：独立安装包

1. 打开 DSH 左侧「插件 → 添加插件」。
2. 把下面完整链接填入「插件包名、GitHub 仓库地址或本地目录路径」输入框，**不要填入“安装源 / 自定义地址”**。

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/wallpaper-bridge-v0.3.6-dsh020rc2.1/dsh-local-we-skin-0.3.6-dsh020rc2.1.tgz
```

3. 「安装源」保持默认，或选择 npm 官方源 / 中国大陆镜像源。它是依赖下载源，不是 GitHub 链接输入框。
4. 安装完成后，确认 `@dsh-local/we-skin` 已启用。
5. 保存草稿，等待任务结束，完整退出 DSH 后重新打开。
6. 打开「设置 → DSH 壁纸桥」，查看当前壁纸并调整显示效果。插件列表仍可能显示内部包名，这是兼容保留，不是安装失败。

### 下载后本地安装

从 [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/wallpaper-bridge-v0.3.6-dsh020rc2.1) 下载 `.tgz`，无需解压，在同一输入框填写实际绝对路径，例如：

```text
file:D:/DSH-plugins/downloads/dsh-local-we-skin-0.3.6-dsh020rc2.1.tgz
```

如果已下载整个仓库，填写其中单插件目录的实际绝对路径，例如 `D:/my-dsh-plugins/plugins/wallpaper-bridge`；不要填写仓库根目录或 `plugins` 父目录。

未发布到 npm，仅填包名不能下载。仓库 GitHub 地址指向多插件集合，不能直接当作本插件安装地址；Source code 压缩包也不是独立 `.tgz` 安装包。

### 升级与卸载

当前 DSH 插件界面没有自动更新：在「插件」页停用、卸载旧版，再安装新版并完整退出重开。先备份自己的壁纸配置。不要删除 DSH 账号、会话历史或其他插件。

配置仍保存到 `DSH_HOME/storages/we-skin/config.json`；默认 `DSH_HOME` 为用户主目录下 `.dsh`。兼容读取旧 `%APPDATA%/dsh-skin-we/config.json`，不自动删除。场景静态图缓存位于 `%APPDATA%/dsh-skin-we/art/`（无 APPDATA 时在用户主目录）。本插件不提供清空用户数据操作。

## Wallpaper Engine 检测与排错

- 默认检查 Steam 常见安装位置与 Windows Steam 注册表位置。如果未找到，在启动 DSH 的环境中设置 `DSH_WE_CONFIG`，指向你自己的 `wallpaper_engine/config.json`，再重新打开 DSH；不需要修改源码。
- 切换壁纸后用「重新检测」检查。Host 每 750ms 检查；Desktop 每 1 秒轮询。Web 保留 SSE 与 2.5 秒后备轮询，但本次不声明 Web 端已完成原生验收。
- 场景显示静态图或缩略图是预期限制。视频黑屏时先换浏览器支持的 MP4 / WebM；静音为默认设置。
- 网页壁纸不工作时，可能依赖被隔离禁止的能力。不要为此开放 `allow-same-origin` 或移除沙箱。
- 插件只读 WE 配置和壁纸文件，不修改 WE 设置；它不会拉起 Wallpaper Engine。

## 安全、隐私与素材

- 代码以本机用户权限运行。只对本地回环 HTTP / Desktop 内部传输开放插件路由，不是手机、局域网或互联网壁纸分享服务；本地路由也不是操作系统级安全沙箱。
- 插件不读取模型密钥、账号余额或聊天历史，不添加遥测。诊断与状态包含本机壁纸文件位置，不要原样上传。
- 网页壁纸是第三方代码。iframe 使用不含 `allow-same-origin` 的脚本沙箱，HTML 响应另带沙箱 CSP 并禁止连接请求；这不构成完整网络或恶意内容隔离，仍可能加载图片等外部素材。只使用可信壁纸。
- 不分发 Wallpaper Engine 程序、Workshop 壁纸、截图、音乐或角色素材。用户应自行合法取得壁纸；代码许可证不授予任何壁纸素材权利。

## 验证状态与反馈

公开副本已增加针对配置、路径边界、视频 Range、桌面轮询、网页隔离及模块装载的离线测试。打包、脱敏与自动检查结果见[发布检查记录](../../docs/release-checks/wallpaper-bridge.md)。

原本机版本有桌面使用记录，但**不是本公开版的原生全场景验收**；本公开版尚需实际安装后测试图片、视频、网页、场景与多显示器行为，因此标为预发布。自动检查通过不代表这些场景已全部验证。

反馈请提交 [Issue](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues)，注明 DSH / 插件版本、壁纸类型与脱敏复现步骤。不要附私人配置、完整文件路径或有版权限制的壁纸文件。

## 许可证与来源

[MIT License](LICENSE)。保留原贡献者声明与社区参考来源，详见 [NOTICE.md](NOTICE.md)。本插件与侧边会话、酒馆、桌宠互相独立。
