# Security and privacy / 安全与隐私

## 中文

这是可信本机用户使用的社区插件，不是多用户授权系统或 OS 沙箱。官方 Connection 负责请求认证和来源限制；插件只使用自己的精确路由和绑定会话检查，不绕过认证。

只读观察主对话，不代表侧 Agent 没有文件/工具权限。主记录可能含私人信息并进入所选模型上下文；通用工具仍按 DSH 权限执行。冲突工具名规则不是完整的副作用分析或提示注入防护。

仓库和发布包不得包含账号、密钥、Cookie、个人路径、真实会话、工作区数据、测试启动记录或授权信息。扫描只覆盖常见模式，不是安全保证。提交 Issue 前请人工脱敏截图、路径、文本和附件，不要上传整个配置目录。

发现疑似漏洞时，不要先公开凭据或可利用的私人数据。优先使用 GitHub 仓库的私密漏洞报告功能（若可用）；否则先仅说明存在安全问题，请维护者提供私密沟通方式。真实网络断线或升级异常请保留历史，不清空配置来规避。

## English

This community plugin targets trusted local users, not multi-user authorization or OS sandboxing. Official Connection services provide request authentication and origin restrictions; the plugin uses its own exact routes and bound-session checks without bypassing authentication.

Read-only main observation does not remove the side Agent's tool/file permissions. Main records may contain private data and enter the selected model's context; general tools remain governed by DSH permissions. Tool-name conflict rules are not complete side-effect analysis or prompt-injection protection.

Do not include accounts, keys, cookies, personal paths, real sessions, workspace data, test startup records or authentication material in this repository or releases. Scanning detects common patterns, not all secrets. Manually redact screenshots, paths, text and attachments before posting Issues; never upload entire configuration directories.

For suspected vulnerabilities, do not publicly post credentials or exploitable private data. Prefer GitHub's private vulnerability reporting when available; otherwise ask the maintainer for a private contact without publishing sensitive details. Preserve history when investigating network or upgrade problems instead of clearing configuration to mask the failure.
