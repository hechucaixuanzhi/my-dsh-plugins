# Repository instructions / 仓库约定

## 中文

- 每个插件仅放在 `plugins/<插件名>/`，拥有独立版本和安装包。不要把私有集中目录整个复制进来。
- 每次修改任何插件文件，都在同一提交中更新根 `README.md` 和 `README.en.md`，以及对应插件的两份 README 和 CHANGELOG。运行时代码、插件清单或包元数据更新时递增插件版本；同步版本、兼容范围、功能、限制和安装链接。
- 新增插件前确认来源、许可证、素材授权与桌面兼容性。不要把社区代码/素材标为完全原创。
- 不提交凭据、账号配置、绝对个人路径、真实会话 ID、日志、截图、测试环境、依赖或历史安装包。脱敏工作只在公开副本进行，不覆盖本机运行插件或用户数据。
- 暂存必须使用明确文件清单，不用全量暂存。提交前执行 `npm test`、`npm run check:staged`，检查实际 npm 包清单与内容。
- 离线测试、真实桌面测试、用户确认分别记录；没有证据的场景标为未验证。不把本机通过泛化为未来版本支持。
- 不默认重启 DSH、不发送付费模型请求、不删除历史或草稿。发布前先通过检查，再推送；测试日志和授权信息永不上传。

## English

- Keep each plugin in `plugins/<slug>/` with its own version and package. Never copy an entire private plugin collection into this repository.
- Every plugin-file change must update root `README.md` and `README.en.md`, both plugin READMEs and its CHANGELOG in the same commit. Bump the plugin version for runtime, manifest or package-metadata changes; synchronize compatibility, behavior, limitations and installation links.
- Verify provenance, licenses, asset rights and Desktop compatibility before adding plugins. Never label third-party work as wholly original.
- Exclude credentials, account settings, personal absolute paths, real session IDs, logs, screenshots, test environments, dependencies and old archives. Redact public copies without overwriting live local plugins or user data.
- Stage exact paths, never everything. Before committing run `npm test` and `npm run check:staged`, then inspect the actual npm package contents.
- Separate offline checks, native Desktop evidence and user confirmation. Mark unsupported claims as unverified; do not imply future-version compatibility.
- Do not automatically restart DSH, make paid model calls or delete history/drafts. Check before pushing; never publish authentication material or private test logs.
