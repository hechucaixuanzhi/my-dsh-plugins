# My DSH Plugins

中文 | [English](README.en.md)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 桌面版的开源社区插件集合。每个插件独立安装、独立版本管理。

本项目非 DeepSeek 官方项目。仓库根目录不是插件安装包，请按下方说明安装所需插件。

## 插件列表

| 插件 | 最新版本 | 兼容 DSH | 功能 | 下载 |
| --- | --- | --- | --- | --- |
| [侧边会话 / Session Panel](plugins/session-panel/README.md) | `2.4.0-dsh020rc2.9` | `0.2.0-rc.2` 桌面版 | 独立侧边 Agent；只读查看主对话的消息、执行轨迹和运行状态 | [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) |
| [DSH 壁纸桥 / Wallpaper Bridge](plugins/wallpaper-bridge/README.md) | `0.3.6-dsh020rc2.1`（预发布） | Windows `0.2.0-rc.2` 桌面版 | 对接本机 Wallpaper Engine；壁纸显示、自适应配色和透明度；场景仅静态图 | [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/wallpaper-bridge-v0.3.6-dsh020rc2.1) |
| [DSH 酒馆桥 / Tavern Bridge](plugins/sillytavern-bridge/README.md) | `0.3.1-dsh020rc2.1`（预发布） | Windows `0.2.0-rc.2` 桌面版 | 一键启动预装酒馆；可选 DSH 模型 API 共享与授权工作区配置编辑 | [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/sillytavern-bridge-v0.3.1-dsh020rc2.1) |

## 使用前准备

- 安装兼容版本的 DSH Desktop，具体版本见插件列表。
- 侧边会话：在 DSH 中完成账号或模型配置，确认普通对话正常；复用已有模型与权限，无需另填密钥，调用按提供方规则计费。
- 壁纸桥：本机安装 Wallpaper Engine 并应用壁纸，不需要模型配置或模型调用。公开版还需原生安装验收，详见[验证范围](docs/release-checks/wallpaper-bridge.md)。
- 酒馆桥：**先自行下载、安装 SillyTavern 与 Node.js 24，完成酒馆依赖安装**；目标酒馆版本 1.19.0。插件不包含或自动下载酒馆。模型共享默认关闭，启用后安装本机酒馆扩展并自动连接 DSH API，无需手动 Connect；保留旧连接快照，模型生成可能计费。需要酒馆扩展启用。

## 快速安装

以下以侧边会话插件为例。

1. 打开 DSH 左侧「插件 → 添加插件」。
2. 将下面的完整链接粘贴到「包名或地址」输入框，**不是“安装源 / 自定义地址”**。

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/session-panel-v2.4.0-dsh020rc2.9/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

3. 「安装源」可保持默认，或使用 npm 官方源、中国大陆镜像源。该选项用于 npm 包及依赖下载，不是 GitHub 地址输入框。
4. 点击「安装」，完成后确认 `@dsh-local/session-panel` 已启用。
5. 保存草稿、等待任务结束，通过应用菜单或托盘「退出」完整关闭 DSH，再重新打开。只刷新页面或关闭窗口可能不会重启应用。
6. 在右侧栏「开始 → 侧边会话」打开插件。右栏收起时可按 `Ctrl + Alt + B`。

### 本地安装

如果无法直接下载安装包，可在 [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) 下载独立 `.tgz` 文件，无需解压，然后在同一输入框填写本地绝对路径。例如：

```text
file:D:/DSH-plugins/downloads/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

请替换为文件的实际保存位置，不带引号。也可从仓库中的单插件目录安装，详见[完整安装与排错指南](plugins/session-panel/README.md#安装升级与卸载)。

当前插件均未发布到 npm，不能仅填写包名安装。整个仓库地址、仓库根目录以及 GitHub 自动生成的 Source code 压缩包都不是单插件安装入口。

### 安装 DSH 壁纸桥

在同一「添加插件」输入框粘贴壁纸桥独立安装包链接：

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/wallpaper-bridge-v0.3.6-dsh020rc2.1/dsh-local-we-skin-0.3.6-dsh020rc2.1.tgz
```

确认 `@dsh-local/we-skin` 已启用，保存草稿、等待任务结束并完整退出重开后，在「设置 → DSH 壁纸桥」使用。公开名称已更新，内部包名与配置位置保留。支持图片、浏览器可解码视频和有限网页壁纸，**场景壁纸仅提取静态图或显示预览图，不复制动态特效**。

本地安装、检测失败、升级与限制见[壁纸桥指南](plugins/wallpaper-bridge/README.md)。不包含 Workshop 素材。

### 安装 DSH 酒馆桥

先安装好酒馆，再在同一「添加插件」输入框粘贴独立安装包链接：

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/sillytavern-bridge-v0.3.1-dsh020rc2.1/dsh-local-sillytavern-bridge-0.3.1-dsh020rc2.1.tgz
```

确认 `@dsh-local/sillytavern-bridge` 已启用，保存草稿并等待任务结束，完整退出重开。在「设置 → DSH 酒馆桥」填写酒馆绝对目录、Node 和端口，再点右侧「开始 → 酒馆」。

需要共享模型时，明确开启共享，再把设置页给出的 Base URL 和**本地网关密钥**填入酒馆 Custom 连接；无需复制上游密钥。将酒馆目录作为 DSH 工作区后，可授权 DSH 修改指定配置、预设和世界书；修改前备份、校验并刷新页面，不是实时双向同步。详见[完整指南](plugins/sillytavern-bridge/README.md)和[编辑规范](plugins/sillytavern-bridge/WORKSPACE.md)。

公开包不含个人角色、世界书、聊天、密钥、酒馆本体或旧网关配置；原生安装/真实调用仍待验收，因此为预发布版。

## 使用侧边会话

侧边会话为每个主对话提供独立的聊天历史和草稿，复用官方聊天组件，支持流式回复、图片、附件、`@`、`/`、模型选择和任务停止。

主任务运行期间，可以在侧边询问：

> 主对话现在进行到哪一步？请根据执行记录说明最近完成的工作。
>
> 主对话里提到的这个技术名词是什么意思？请结合当前任务解释。

侧边 Agent 也可以独立处理获准任务。主对话观察接口是只读的，不会向主对话发送消息；停止任一侧任务不会停止另一侧。

更多功能、数据处理方式与限制请参阅[侧边会话文档](plugins/session-panel/README.md)。

## 升级与兼容性

- 升级前查看所用插件的 CHANGELOG 和兼容版本：[侧边会话](plugins/session-panel/CHANGELOG.md)、[壁纸桥](plugins/wallpaper-bridge/CHANGELOG.md)、[酒馆桥](plugins/sillytavern-bridge/CHANGELOG.md)。
- 当前 DSH 界面不支持插件自动更新，请停用并卸载旧插件，再安装新版，随后完整退出并重开 DSH。
- 不需要删除会话历史、清空账号配置或卸载其他插件。
- 仅声明支持插件列表中的 DSH 版本；升级 DSH 后应先确认插件兼容性。

## 安全与隐私

- 插件和通用工具以本机用户权限运行，不是操作系统级沙箱。安装前请确认来源并审阅所需权限。
- 侧边 Agent 读取的主对话内容会进入所选模型的上下文，可能包含私人信息，请留意模型提供方的数据策略。
- 本仓库不分发账号配置、密钥或聊天历史。侧边会话插件不额外添加遥测或独立云端服务。
- 壁纸桥不读取聊天或模型密钥，只读取本机 WE 配置/壁纸并保存自己的显示参数与静态图缓存。网页壁纸仍是第三方代码，只使用可信素材；[隔离与网络限制](plugins/wallpaper-bridge/README.md#安全隐私与素材)不等于完整安全沙箱。
- 酒馆桥模型共享默认关闭；本机网关要求独立随机密钥，并通过 DSH 官方模型服务请求，不解析或分发真实凭据。授权文件编辑依靠 DSH 原有权限，工作区规范不是 OS 沙箱；酒馆聊天内容会按其连接进入所选提供方。

安全问题及脱敏要求见 [SECURITY.md](SECURITY.md)。

## 文档与反馈

- [侧边会话使用指南](plugins/session-panel/README.md)
- [壁纸桥使用指南](plugins/wallpaper-bridge/README.md)
- [酒馆桥使用指南](plugins/sillytavern-bridge/README.md)
- [侧边会话验证说明](docs/release-checks/session-panel.md) · [壁纸桥验证说明](docs/release-checks/wallpaper-bridge.md) · [酒馆桥验证说明](docs/release-checks/sillytavern-bridge.md)
- [问题反馈与功能建议](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues)

反馈时请提供 DSH 版本、插件版本、复现步骤和脱敏后的截图，不要上传密钥、账号配置或完整会话文件。

## 参与贡献

欢迎提交问题、文档改进和插件适配。开发环境、检查命令及贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本仓库自有代码采用 [MIT License](LICENSE)。各插件保留自己的许可证与来源声明：[侧边会话](plugins/session-panel/NOTICE.md)、[壁纸桥](plugins/wallpaper-bridge/NOTICE.md)、[酒馆桥](plugins/sillytavern-bridge/NOTICE.md)。代码许可证不包含壁纸素材授权，也不替代独立 SillyTavern 程序的 AGPL-3.0 许可。
