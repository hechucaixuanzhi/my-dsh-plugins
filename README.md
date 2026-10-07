# My DSH Plugins

中文 | [English](README.en.md)

面向 DeepSeek Harness 桌面版的独立社区插件集合。一个仓库统一管理，每个插件有自己的目录、版本、说明和安装包；**本仓库不是官方发行版，也不是一个整合安装包**。

## 插件目录

| 插件 | 最新版本 | 已适配 DSH | 用途 | 安装 |
| --- | --- | --- | --- | --- |
| [侧边会话 / Session Panel](plugins/session-panel/README.md) | `2.4.0-dsh020rc2.9` | `0.2.0-rc.2` 桌面版 | 独立侧边 Agent；只读查看所属主对话的消息、轨迹与运行状态 | [独立安装包](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) |

目前只收录侧边会话。酒馆、壁纸和宠物是不同插件，未随本次发布混入。

## 安装

### 推荐：在桌面版粘贴安装包地址

先确认 DSH Desktop 为 `0.2.0-rc.2`。打开左侧「插件 → 添加插件」，在「包名或地址」输入框粘贴下面这一整行，**不是填进“安装源 / 自定义地址”**：

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/session-panel-v2.4.0-dsh020rc2.9/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

1. 「安装源」保持默认、npm 官方源或中国大陆镜像源即可。它选择 npm 下载源，不是填写 GitHub 仓库地址的位置；下载依赖时仍可能使用该源。
2. 点击「安装」，等待完成，在已安装列表确认 `@dsh-local/session-panel` 已启用。当前包未发布到 npm，不能仅填写这个包名安装。
3. 保存未发送草稿、等待任务结束后，使用应用菜单「退出」或托盘「退出」完整关闭，再打开 DSH；不要只刷新页面或点击窗口右上角的关闭按钮。
4. 展开右侧栏，在「开始 → 侧边会话」打开；右栏收起时可按 `Ctrl + Alt + B`。

### 备选：本地文件或单插件目录

GitHub 下载失败时，可自行从 [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) 下载 `.tgz`，**无需解压**，再将以下形式填进同一个输入框（替换为实际保存路径，不带引号）：

```text
file:D:/DSH-plugins/downloads/dsh-local-session-panel-2.4.0-dsh020rc2.9.tgz
```

也可下载并解压本仓库，填入其中 `plugins/session-panel` 的绝对目录。例如仓库解压到 `D:/DSH-plugins/my-dsh-plugins` 时：

```text
D:/DSH-plugins/my-dsh-plugins/plugins/session-panel
```

以上目录只是示例，须实际存在。不要填写整个仓库的 GitHub 地址、GitHub 的 `tree/...` 网页、仓库根目录、`plugins` 父目录或 GitHub 自动生成的 Source code 压缩包：它们不是此插件的独立安装包。

若显示「路径不存在或不是有效的插件包」，检查是否填了绝对路径、文件是否已下载，或目录中是否直接包含 `package.json` 和 `cordis.patch.yml`。升级时当前界面要求先卸载旧包再安装新版；不要清空 DSH 数据。完整步骤和排错见[插件说明](plugins/session-panel/README.md#安装升级与卸载)。

安装形式参考[官方插件管理说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md)；本插件兼容性仍以以上固定版本为准。

不需要额外填写模型密钥；使用 DSH 已配置的模型与权限。插件仍会产生所选模型正常的调用费用。仅声明兼容表中的版本，不保证新版 DSH 自动兼容。

## 使用边界

- 侧边会话独立于主对话，可以执行获准任务；只读观察入口不向主对话投递内容。
- 主对话摘要及按需读取的记录会进入侧 Agent 的模型上下文，可能包含私人内容。发送前请考虑所选模型提供方及账号的数据策略。
- 插件和通用工具运行在本机用户权限下，不是操作系统级沙箱。工作区、模型上下文及账号由 DSH 管理，不会随本仓库分发。
- 详细验收范围、断线恢复边界和隐私说明见[发布检查记录](docs/release-checks/session-panel.md)及 [SECURITY.md](SECURITY.md)。

## 更新规则

**每次增加或更新插件，必须在同一个提交中同步更新本文件和 [README.en.md](README.en.md)。** 同时更新该插件的中英文 README、CHANGELOG 和必要的版本号，保持版本、兼容范围、安装入口、功能与限制一致。

仓库检查与 GitHub Actions 会对缺少双语总 README 更新的插件变更报错；不是仅靠口头约定。规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。检查通过并不等于未测试的桌面版本或场景已验收，也不等于仓库已设置分支保护。

## 开发与许可

使用 Node.js 24，无需安装仓库依赖即可执行 `npm test` 和 `npm run check`。安装包只取插件的明确文件清单；`dist/`、本机配置、凭据、会话、日志、截图和测试环境不得提交。

本仓库自有代码采用 [MIT](LICENSE)。对接 DeepSeek Harness 的来源与声明见 [NOTICE.md](plugins/session-panel/NOTICE.md)。后续第三方插件必须分别保留原许可证和素材来源，不能直接沿用本仓库的原创声明。
