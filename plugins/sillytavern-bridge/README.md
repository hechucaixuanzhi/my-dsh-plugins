# DSH 酒馆桥 / DSH Tavern Bridge

中文 | [English](README.en.md)

在 DeepSeek Harness 右侧一键打开本机 SillyTavern，可选择通过受保护的本地网关复用 DSH 模型，并在授权的酒馆工作区中让 DSH 协助修改配置、预设和世界书。

本插件是独立社区集成，不是 DeepSeek 或 SillyTavern 官方产品，不包含酒馆本体、角色卡、聊天、私人配置、密钥或模型网关个人配置。

## 版本与前提

- 插件 `0.3.1-dsh020rc2.1`，首个公开预发布版；内部包名保留为 `@dsh-local/sillytavern-bridge`。
- 适配目标：Windows DSH Desktop **`0.2.0-rc.2`**，本机 SillyTavern **`1.19.0`**。其他版本未验证；本次不自动升级 DSH 或酒馆。
- **必须先自行下载并安装 SillyTavern、Node.js 24，并完成酒馆依赖安装。** 酒馆目录应包含 `server.js`、`package.json`、`node_modules/`。参考[酒馆官方 Windows 安装指南](https://docs.sillytavern.app/installation/windows/)，从[官方 Release](https://github.com/SillyTavern/SillyTavern/releases)取得适合的版本。
- DSH 的右侧 Browser 插件需启用。先确认普通 DSH 对话和独立酒馆都能正常使用。
- 本插件不会下载酒馆、执行 npm install、运行 Start.bat、升级程序或更改酒馆网络白名单。

## 功能与边界

| 能力 | 实现与限制 |
| --- | --- |
| 一键入口 | 点击右栏「开始 → 酒馆」，检测/启动预装服务，就绪后打开官方 Browser 标签。并发点击共享启动过程；占用、超时和失败有可见错误及重试 |
| DSH 模型 API 共享 | 用户明确开启后，启动仅回环监听且需本地密钥的 OpenAI-compatible 网关；实时读取 DSH 已注册提供方/模型目录，由 DSH 官方模型服务完成实际认证和请求，不解析或转存 DSH 凭据文件 |
| DSH 修改酒馆文件 | 用户把酒馆目录作为 DSH 工作区，明确授权后，由 DSH 原有文件工具修改目标配置、预设、世界书等。提供双语操作规范，不新增通用文件写入接口 |

**这不是完整酒馆移植或实时双向同步。** 不自动读取当前选中角色，不把 DSH 主聊天与酒馆聊天合并，不保证文件写入立即反映到已打开的页面。

## 安装插件

1. 完成上面的酒馆与 Node 安装后，打开 DSH 左侧「插件 → 添加插件」。
2. 把下面完整链接粘贴到「包名或地址」输入框，**不是“安装源 / 自定义地址”**：

```text
https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/download/sillytavern-bridge-v0.3.1-dsh020rc2.1/dsh-local-sillytavern-bridge-0.3.1-dsh020rc2.1.tgz
```

3. 安装源可保持默认；它用于 npm 依赖下载，不是 GitHub 链接输入框。
4. 确认 `@dsh-local/sillytavern-bridge` 已启用。保存草稿、等待任务结束，完整退出 DSH 后重开。
5. 打开「设置 → DSH 酒馆桥」，填写酒馆**绝对安装目录**、Node 可执行程序以及酒馆/网关端口，点击「保存」。目录无默认盘符，不会扫描私人目录。
6. 在右侧「开始 → 酒馆」打开。右栏收起时按 `Ctrl + Alt + B`。

### 本地安装或源码目录

可先从 [Release](https://github.com/hechucaixuanzhi/my-dsh-plugins/releases/tag/sillytavern-bridge-v0.3.1-dsh020rc2.1) 下载独立 `.tgz`，无需解压；在同一输入框填写文件的实际绝对路径，例如：

```text
file:D:/DSH-plugins/downloads/dsh-local-sillytavern-bridge-0.3.1-dsh020rc2.1.tgz
```

也可填写已下载仓库中的单插件目录，例如 `D:/my-dsh-plugins/plugins/sillytavern-bridge`。整个仓库地址、仓库根目录、`plugins` 父目录和 GitHub Source code 压缩包都不是本插件的独立安装入口。未发布到 npm，不能仅填包名下载。

## 共享 DSH 模型 API

1. 在 DSH 中配置并验证需要的模型。只在你信任的本机启用共享，模型调用按所选提供方计费。
2. 在插件设置中勾选「启用 DSH 模型共享并自动连接酒馆」。这同时授权安装本机酒馆扩展、备份并更新当前登录用户的连接设置。可填写提供方白名单；留空共享所有已注册提供方的可列出模型。
3. 保存，再点击右栏酒馆入口。网关随入口启动，**默认端口 8100，仅监听本机回环地址**；可改成其他 1024–65535 端口，但不能与酒馆端口相同。
4. 插件安装轻量 **DSH Tavern Bridge** 酒馆扩展。页面就绪后，通过酒馆原生设置/密钥接口保存当前用户的 Custom API 地址、本地网关密钥、共享模型和“自动连接上次服务器”，然后自动连接，**无需填写密钥或点击 Connect**。不会发送生成请求。
5. 已选模型仍在共享列表中时保留，否则选择首个模型。清空旧 Custom 额外请求头、请求体覆盖和字段排除，防止旧提供方配置干扰。模型 ID 为 `提供方/模型`。
6. 从 DSH 入口重新打开会获取当前模型目录；普通刷新使用酒馆内置自动连接。DSH 和网关必须保持运行，模型能列出不等于上游认证或额度允许生成。

酒馆必须启用扩展系统且未停用 DSH Tavern Bridge，安装目录需要可写。自动连接仅支持 **SillyTavern 1.19.0**，其他版本明确报错。多用户登录时先正常登录，再从 DSH 重新打开；不会绕过登录。请关闭其他正在编辑连接设置的页面，防止竞争保存。

首次连接在当前用户的 `extension_settings.dsh_tavern_bridge.previousConnection` 保留原连接字段、自动连接开关和旧 Custom 密钥 ID；旧密钥仍保留在酒馆密钥库。恢复时关闭共享，按快照恢复字段和开关，并在酒馆密钥管理中选择旧密钥。停用共享不会自动覆盖用户后续修改；没有新交接令牌时扩展不会改写连接。请勿上传配置或密钥库。

交接使用两分钟有效、一次性令牌，放在 URL fragment 中并立即移除。长期网关密钥不进入 URL、扩展源文件或普通状态响应。扩展更新保留本机 `.bak` 副本并校验旧代码；同名未知扩展或本地改动会阻止覆盖。设置中的手动密钥入口保留用于排障。

### 兼容范围

- 支持文本 Chat Completions：JSON / SSE、system / developer / user / assistant 消息、max_tokens、temperature、stop、reasoning_effort；正文与 `reasoning_content` 分开。developer 映射为 DSH system 消息，保留顺序。
- 通过 DSH 官方适配器调用模型，而非继承旧独立网关的手写 providers.json。旧网关中的手动覆盖不会自动迁移；需要在 DSH 中配置对应提供方/模型。
- 不提供图像、音频、文件、工具调用、多候选、Embeddings 或 Responses API；不支持的内容会报错，不会当成普通文本悄悄丢弃。
- top_p、top_k、seed、惩罚项、logit_bias 等额外采样字段不映射，不能宣称完整 OpenAI API 兼容。具体推理档位、账号登录模型和提供方能力仍依赖 DSH；未经过本公开版真实调用验收。
- 思考有内容但正文为空时明确报错；**插件不追加自动付费重试**，DSH/提供方原有重试策略可能仍生效。请求体上限 2 MiB，输出上限 8 MiB，最多 4 个并发模型请求，单次默认 180 秒。
- DSH 必须保持运行才能使用这个集成网关。停用插件/退出 DSH 时关闭自己的网关并取消其请求；不会关闭其他网关或强杀酒馆。

## 让 DSH 修改酒馆配置、预设与世界书

把酒馆安装目录添加为 DSH 工作区。每个会话先告知服务哪个作品/角色与具体任务，例如：

> 只读检查我指定角色关联的世界书和预设，先说明当前状态，不修改任何文件，不读取密钥。
>
> 我授权你只修改已确认的目标文件和字段。先备份并检查是否有页面未保存，再修改、校验，并告诉我如何刷新与恢复。

从插件设置查看编辑规范，或阅读 [WORKSPACE.md](WORKSPACE.md)。用户可手动审阅并合并到已有 `AGENTS.md`，**不要覆盖原有规则**；模板不是系统级权限保证。全局 config.yaml、settings.json、连接配置与普通世界书作用范围不同，必须单独明确授权字段。PNG 角色卡不得用文本工具直接改。

酒馆页面可能缓存旧副本并在保存时覆盖磁盘。改前备份和检查并发变化，改后重新读取、校验，并让用户刷新确认。上传仓库的是操作规范，不是你的角色、作品或配置文件。

## 配置、升级与排错

- 插件自己的目录/端口配置：`DSH_HOME/storages/sillytavern-bridge/config.json`；本地网关密钥单独保存在同目录 `gateway-auth.json`，不写入普通配置。默认 DSH_HOME 是用户主目录下 `.dsh`。Windows 上文件 mode 不等同于完整 ACL 隔离，请保护用户账户与目录权限。
- 修改设置会关闭本插件自己的网关，下一次点击入口重新启动；有活跃请求时拒绝保存。不要在聊天过程中更改这些设置。
- 若旧独立网关占用了 8100，不会自动接管、终止或绕过它的认证；换一个插件网关端口并相应更新酒馆 Base URL，或由用户自行管理旧服务。
- 酒馆启动失败：先检查目录与依赖、Node 路径，再手动启动酒馆查看错误。插件不记录服务 stdout/stderr，避免意外保存私人内容。
- 本版就绪检测目标为普通 HTTP 酒馆首页。已开启 HTTP Basic Auth、HTTPS 或更改首页标题的安装可能被安全地判为未就绪；这些场景未声明兼容，不要为安装插件关闭既有安全措施。
- 本插件的右栏显示仅针对官方 Desktop，不适配远程 Web iframe。手机访问酒馆属于酒馆自身的局域网配置；本插件不打开防火墙、不改监听或白名单，也不把模型网关暴露到手机或外网。
- 当前 DSH 没有插件自动更新：停用并卸载旧版，安装新版后完整退出重开。先保存草稿、等待任务结束。无需删除酒馆数据、聊天历史或其他插件。
- 酒馆子进程可能在 DSH 退出后继续运行；重开时检测并复用。启动超时不会强杀进程，也不会在该进程尚在时重复拉起。

## 安全与验证

共享默认关闭，网关需随机本地密钥；限制回环、Host 和浏览器 Origin，无通配跨域许可。DSH 插件设置/启动请求走已鉴权的官方 Connection。插件不直接读取 DSH 凭据文件、不新增遥测，不记录请求正文或上游异常详情。这仍不是 OS 沙箱：有本机用户权限或本地网关密钥的程序可能使用模型。

公开文件与安装包需经过白名单、敏感模式扫描和人工审核，详见[发布检查](../../docs/release-checks/sillytavern-bridge.md)。离线测试使用合成数据和本地临时端口，无真实密钥、模型请求或酒馆数据。可选测试使用本机官方归档的实际公开方法，仍不等于原生桌面验收。

**本公开版尚需安装后的右栏/设置操作和真实酒馆 Connect、出字、流式、取消及文件编辑流程验收，因此发布为预发布版。** 真实模型测试可能收费，需用户自行明确执行。反馈请发[脱敏 Issue](https://github.com/hechucaixuanzhi/my-dsh-plugins/issues)，不上传密钥、整个配置目录、私人角色或聊天。

## 许可证与来源

桥接代码与模板采用 [MIT License](LICENSE)，来源说明见 [NOTICE.md](NOTICE.md)。不分发 SillyTavern、DSH 本体或其依赖；SillyTavern 自身保持其 [AGPL-3.0](https://github.com/SillyTavern/SillyTavern/blob/release/LICENSE) 许可。与侧边会话、壁纸桥、桌宠是独立插件。
