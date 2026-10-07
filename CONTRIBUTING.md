# Contributing / 维护与贡献

## 中文

每个插件是一个独立模块，不在仓库根注册 `dsh.bundle`。当前分别从 `plugins/session-panel` 和 `plugins/wallpaper-bridge` 生成独立发布包。

### 开发环境与检查

使用 Node.js 24。在仓库根目录执行以下检查，无需安装仓库依赖：

```sh
npm test
npm run check
```

检查使用合成数据，不发送真实模型请求。安装或使用已发布插件不要求单独配置此开发环境。

### 文档与发布要求

一次插件更新必须同时包含：

1. 插件代码及必要的版本递增。
2. 根 `README.md` + `README.en.md`：插件目录中的版本、兼容范围、安装链接及用户可见变更同步；仅写“已更新”不能代替有效说明。
3. 对应插件 `README.md` + `README.en.md` + `CHANGELOG.md`：中英文内容一致，标明限制及验证范围。
4. 针对性测试，以及来源/许可证/脱敏检查。新素材必须有明确授权，不能因未被文本扫描识别就视为安全。

执行 `npm test` 和 `npm run check`；仅将明确列出的公开文件暂存后执行 `npm run check:staged`。门禁检查新增或修改的插件是否同步更新双语说明、运行时变更是否递增版本，并扫描常见敏感内容及禁入文件。它不能证明没有未知秘密，也不能代替人工权限和素材审核。

GitHub Actions 会对缺少上述双语文档同步的插件变更报错。检查通过不代表未测试的 DSH 版本或原生场景已验收，也不代表已配置分支保护。公开 README 面向用户介绍功能、安装、兼容性和限制；完整维护流程在本指南与 `AGENTS.md` 中维护。

插件打包使用 `npm pack --ignore-scripts`，输出放在被忽略的 `dist/`，而不是提交二进制归档。确认 tar 内只含公开插件文件，再以 `插件名-v版本号` 创建独立 GitHub Release，上传该插件 tgz。未来其他插件保持各自 tag/Release，不混入当前包。

实际归档检查：`node scripts/inspect-package.mjs <插件目录名> <tgz路径>`。检查逐文件比对公开源码、文件白名单和常见敏感模式，不解压到工作目录，不运行安装脚本。

CI 的基线来自提交/PR，不运行安装脚本或依赖安装，不读取本机 DSH 数据。使用 `DSH_ASAR` 指定合法取得的当前 DSH 安装归档时，可额外运行真实官方状态机离线测试；未设置时明确跳过，不能写成已通过。该归档及其内容不得随测试提交。

## English

Each plugin is an independent module; the repository root does not register a `dsh.bundle`. Build separate packages from `plugins/session-panel` and `plugins/wallpaper-bridge`.

### Development environment and checks

Use Node.js 24. Run these checks from the repository root without installing repository dependencies:

```sh
npm test
npm run check
```

Checks use synthetic data and make no live model calls. Installing or using a released plugin does not require separately configuring this development environment.

### Documentation and release requirements

Every plugin update must include:

1. Plugin changes and a version bump when needed.
2. Root `README.md` + `README.en.md`, synchronizing catalog versions, compatibility, install links and meaningful user-visible changes, not just “updated”.
3. The plugin's `README.md` + `README.en.md` + `CHANGELOG.md`, with equivalent content, limitations and verification scope.
4. Targeted tests plus provenance, licensing and redaction checks. New assets require documented rights; absence of a text-scanner finding is not approval.

Run `npm test` and `npm run check`. Stage explicitly named public files, then run `npm run check:staged`. Checks enforce bilingual documentation updates and runtime version bumps and detect common sensitive patterns and forbidden files. They do not prove the absence of unknown secrets or replace human review of permissions and asset rights.

GitHub Actions fails plugin changes missing the synchronized bilingual documents above. Passing checks do not validate untested DSH versions or native scenarios, or imply that branch protection is configured. Public READMEs describe features, installation, compatibility and limitations for users; complete maintenance procedures belong in this guide and `AGENTS.md`.

Use `npm pack --ignore-scripts`, with output in ignored `dist/`, rather than committing binary archives. Inspect the tar contents before creating a per-plugin GitHub Release tagged `plugin-slug-vVERSION` and uploading that plugin's tgz. Future plugins keep separate tags/releases and are not bundled into this package.

Inspect the actual archive with `node scripts/inspect-package.mjs <plugin-slug> <tgz-path>`. It compares every file with public source, checks the allowlist and common sensitive patterns, without extracting into the worktree or running install scripts.

CI checks the commit/PR baseline without installing dependencies, running install scripts or reading local DSH data. Set `DSH_ASAR` to a legitimately obtained current DSH installation archive to run additional offline tests with real official state machines. Without it, those tests explicitly skip, not pass. Never commit the archive or its contents.
