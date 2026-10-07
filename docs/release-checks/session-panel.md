# Session Panel release checks / 侧边会话发布检查

Release / 发布版本：`2.4.0-dsh020rc2.9`
Target / 适配版本：DSH Desktop `0.2.0-rc.2`
Date / 日期：2026-10-07

## 中文

### 范围与来源

本次只公开侧边会话独立插件，不公开其他插件、私有开发集合、DSH 安装归档、模型配置、会话或测试环境。JavaScript 为可维护源码，不包含打包后的官方库。MIT 声明与上游 DeepSeek Harness 归属保留，详见插件 LICENSE/NOTICE。

公开 `.9` 从人工基础验收通过的 `.8` 整理，客户端内容保持一致。唯一宿主代码变化是移除开发机特有的旧单例会话标识及其固定值判断；通用元数据检查、每主对话派生身份及旧深度 1 会话的继承迁移保持。已覆盖移除后拒绝 live/persisted 隐藏会话作为主对话的回归。

本机运行插件和用户历史/草稿没有被替换、迁移或删除。公开包不支持迁移那个开发机专有旧单例，也不携带任何真实身份值。

### 脱敏与权限检查

- 从明确源码清单重新建立公开树，不复制旧 Git 历史、测试启动记录或整个私有目录。
- 去除个人用户名路径、真实会话标识、诊断日志与开发机环境说明；公开测试使用合成数据和相对路径，可选官方状态机测试只读取 `DSH_ASAR` 指定的合法安装归档。
- 公开 Git 提交使用 GitHub noreply 身份，不携带私人邮箱；Release 包不含提交配置。
- 仅使用官方认证 Connection 的自有精确路由，校验主/侧身份；不包含向主对话投递的入口。不新增遥测、云端服务、模型密钥或硬编码凭据。
- 已人工检查模型上下文、通用工具及冲突授权边界，并在双语说明中披露：主记录可能进入所选模型上下文，工具守卫不是 OS 沙箱或完整提示注入防护。
- 白名单、常见秘密模式扫描、符号链接拒绝与实际 tar 内容检查通过。检测结果不是“所有秘密都不可能存在”的保证；以后每次发布仍需人工检查。

### 验证证据

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| 公开树测试，提供当前安装归档 | 42/42 通过 | 内存合成数据；真实官方流状态机故障注入；没有真实模型调用 |
| 公开树测试，不提供安装归档 | 25 通过、1 套件明确跳过 | CI 无 DSH 安装，不把跳过当作通过 |
| 发布副本额外兼容回归 | 13/13 通过 | 本地已安装官方依赖；含真实 V4 继承校验；私有验证环境不分发 |
| 客户端与 `.8` 对照 | 一致 | 仅忽略文本换行/文件末尾空行；客户端逻辑未改 |
| 宿主来源对照 | 仅移除旧私有常量和对应固定判断 | 不改通用身份校验或迁移命名空间 |
| 安装包实际内容 | 11 个明确插件文件、27797 字节 | 内容逐项与公开源码一致；扫描未检出常见敏感内容 |
| 双语 README 同步规则 | 正反例测试通过 | 检查插件目录行、版本/兼容范围及同提交更新；翻译语义仍需人工审阅 |
| 用户原生基础验收 | `.8` 已通过 | 轨迹解释、图片/`@`/`/`、历史/草稿隔离、重开、滚动/宽度、回复、双向停止 |

没有将 `.8` 人工验收或模拟断线泛化为 `.9` 全场景原生实测；没有测试所有未来 DSH 版本、所有第三方工具或全部网络故障。GitHub CI 结果以对应提交的 Actions 状态为准，不预先写为成功。

## English

### Scope and provenance

Only the standalone Session Panel plugin is published, not other plugins, private development collections, DSH archives, model configuration, sessions or testing environments. JavaScript is directly maintainable source, without bundled official libraries. MIT notices and DeepSeek Harness attribution are retained in the plugin LICENSE/NOTICE.

Public `.9` is prepared from `.8`, which passed basic manual acceptance. The client is unchanged. The only host-code difference removes an installation-specific legacy singleton constant and its fixed-value check; generic metadata checks, per-main identities and inherited migration of older depth-one side sessions remain. Regression coverage verifies rejection of live/persisted hidden sessions as mains after removal.

The live local plugin and user history/drafts are not replaced, migrated or deleted. Migration of that private singleton is unsupported publicly; no real identity value is distributed.

### Redaction and permissions

- Rebuilt the public tree from an exact source allowlist, without old Git history, startup records or entire private folders.
- Removed personal home paths, real session identifiers, diagnostic logs and machine-specific notes. Public tests use synthetic data and relative paths; optional official-state-machine checks read only a legitimately obtained archive specified by `DSH_ASAR`.
- Public commits use a GitHub noreply identity, not a personal mailbox. Commit configuration is not in the package.
- Uses exact plugin-owned routes through official authenticated Connection services with main/side identity checks, and no main-delivery endpoint. No added telemetry, cloud backend, model key or embedded credential.
- Model context, general tools and conflict authorization were reviewed and disclosed in both languages: main records may enter the selected model context; tool guards are not an OS sandbox or complete prompt-injection protection.
- File allowlists, common-secret scanning, symlink rejection and actual tar inspection passed. This does not prove the absence of every possible secret; future releases still require manual review.

### Evidence

| Check | Result | Boundary |
| --- | --- | --- |
| Public-tree tests with installed archive supplied | 42/42 passed | Synthetic in-memory data and real official stream-state-machine fault injection; no live model calls |
| Public-tree tests without installed archive | 25 passed, 1 suite explicitly skipped | CI has no DSH installation; skip is not pass |
| Additional compatibility replay on public copy | 13/13 passed | Locally installed official dependencies, including real V4 inheritance validation; private harness not distributed |
| Client comparison with `.8` | Identical | Ignoring line endings/trailing blank lines only; no client logic change |
| Host provenance comparison | Only private singleton constant/check removed | Generic identity checks and migration namespace unchanged |
| Actual package | 11 explicit plugin files, 27797 bytes | Each file matches public source; no common sensitive-content findings |
| Bilingual README policy | Positive/negative tests passed | Checks catalog rows, versions/compatibility and synchronized changes; translation semantics require human review |
| User's basic native acceptance | Passed on `.8` | Trajectory explanation, images/`@`/`/`, history/drafts, reopen, scroll/resize, reply presentation and stopping both ways |

Manual `.8` acceptance and simulated disconnects are not represented as exhaustive `.9` native validation. Future DSH versions, all third-party tools and every network failure were not tested. Check the commit's Actions status for GitHub CI results rather than assuming success in advance.
