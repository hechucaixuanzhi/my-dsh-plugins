# Security and privacy / 安全与隐私

## 中文

这是可信本机用户使用的社区插件，不是多用户授权系统或 OS 沙箱。官方 Connection 负责请求认证和来源限制；插件只使用自己的精确路由和绑定会话检查，不绕过认证。

只读观察主对话，不代表侧 Agent 没有文件/工具权限。主记录可能含私人信息并进入所选模型上下文；通用工具仍按 DSH 权限执行。冲突工具名规则不是完整的副作用分析或提示注入防护。

仓库和发布包不得包含账号、密钥、Cookie、个人路径、真实会话、工作区数据、测试启动记录或授权信息。扫描只覆盖常见模式，不是安全保证。提交 Issue 前请人工脱敏截图、路径、文本和附件，不要上传整个配置目录。

发现疑似漏洞时，不要先公开凭据或可利用的私人数据。优先使用 GitHub 仓库的私密漏洞报告功能（若可用）；否则先仅说明存在安全问题，请维护者提供私密沟通方式。真实网络断线或升级异常请保留历史，不清空配置来规避。

酒馆桥的可选网关是另一条本机模型访问边界：共享默认关闭、只监听回环、要求独立随机密钥，限制 Host/Origin、请求大小与并发。不要将其转发到手机/互联网或上传 gateway-auth.json。它通过 DSH 官方 llm 服务调用，不解析凭据文件；启用后共享范围内的 DSH 模型可被持钥本机客户端调用并计费。文件编辑规范只是用户可审阅的说明，不自动提升或限制 OS 权限。原生验收未完成的版本必须明确标为预发布。

酒馆自动连接额外使用仅限酒馆 Origin 的两分钟一次性交接令牌；长期网关密钥通过交接响应进入当前登录用户的酒馆密钥库，不进入 URL、扩展源文件或普通状态。令牌只存在于短暂 URL fragment，页面加载后立即清除。启用共享明确授权扩展安装及当前用户连接更新。旧连接字段与旧密钥只保留在本机；用户仍需避免多个页面竞争修改设置。

## English

This community plugin targets trusted local users, not multi-user authorization or OS sandboxing. Official Connection services provide request authentication and origin restrictions; the plugin uses its own exact routes and bound-session checks without bypassing authentication.

Tavern auto-connect uses a single-use, two-minute handoff restricted to the Tavern Origin. The persistent gateway key enters the signed-in user's native secret store through this response, never URLs, helper source or ordinary state. Only the short-lived token uses a promptly removed URL fragment. Sharing consent covers helper installation and connection updates. Prior fields/keys remain local; users should avoid competing settings edits across tabs.

Read-only main observation does not remove the side Agent's tool/file permissions. Main records may contain private data and enter the selected model's context; general tools remain governed by DSH permissions. Tool-name conflict rules are not complete side-effect analysis or prompt-injection protection.

Do not include accounts, keys, cookies, personal paths, real sessions, workspace data, test startup records or authentication material in this repository or releases. Scanning detects common patterns, not all secrets. Manually redact screenshots, paths, text and attachments before posting Issues; never upload entire configuration directories.

For suspected vulnerabilities, do not publicly post credentials or exploitable private data. Prefer GitHub's private vulnerability reporting when available; otherwise ask the maintainer for a private contact without publishing sensitive details. Preserve history when investigating network or upgrade problems instead of clearing configuration to mask the failure.

Tavern Bridge's optional gateway is a separate local model-access boundary: opt-in, loopback-only, independent random key, Host/Origin checks and request/concurrency limits. Never forward it to phones/the internet or upload gateway-auth.json. It calls DSH's official llm service without parsing credential files; authorized local key holders can invoke shared models and incur charges. Workspace rules are reviewable instructions, not automatic elevation or OS enforcement. Releases lacking native acceptance must be marked prerelease.
