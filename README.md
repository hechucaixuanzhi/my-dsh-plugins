# My DSH Plugins

中文 | [English](README.en.md)

面向 DeepSeek Harness 桌面版的独立社区插件集合。一个仓库统一管理，每个插件有自己的目录、版本、说明和安装包；**本仓库不是官方发行版，也不是一个整合安装包**。

## 插件目录

| 插件 | 最新版本 | 已适配 DSH | 用途 | 安装 |
| --- | --- | --- | --- | --- |
| [侧边会话 / Session Panel](plugins/session-panel/README.md) | `2.4.0-dsh020rc2.9` | `0.2.0-rc.2` 桌面版 | 独立侧边 Agent；只读查看所属主对话的消息、轨迹与运行状态 | [独立安装包](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/session-panel-v2.4.0-dsh020rc2.9) |

目前只收录侧边会话。酒馆、壁纸和宠物是不同插件，未随本次发布混入。

## 安装

1. 打开对应插件的 Release，下载它自己的 `.tgz` 文件，不要把整个仓库地址当作单个插件安装。
2. 在 DSH 的「插件 → 添加插件」中填写下载文件的本地绝对路径（`file:` 安装源）；或下载本仓库后，选择 `plugins/session-panel` 的本地绝对目录，而不是仓库根目录。
3. 启用插件。保存未发送草稿、等待任务结束后，完整退出并重新打开桌面应用；不要只刷新页面。
4. 侧边会话入口位于右侧「开始 → 侧边会话」。详见[插件说明](plugins/session-panel/README.md)。

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
