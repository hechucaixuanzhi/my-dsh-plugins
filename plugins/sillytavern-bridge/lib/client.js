;(() => {
  window.__ModuleLoader__.load({
    id: '@dsh-local/sillytavern-bridge',
    factory: require => {
      const React = require('react'), h = React.createElement;
      const ID = '@dsh-local/sillytavern-bridge', PREFIX = '/api/sillytavern-bridge';
      const desktop = () => location.protocol === 'dsh-app:';
      async function api(suffix, value = {}, signal) {
        const response = await fetch(PREFIX + suffix, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value), cache: 'no-store', signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Bridge request failed');
        return result;
      }
      function TavernEntry({ useTabInfo }) {
        const { tab } = useTabInfo(), [error, setError] = React.useState(''), [busy, setBusy] = React.useState(true);
        const generation = React.useRef(0), abort = React.useRef(null), pending = React.useRef(false);
        async function open() {
          if (pending.current) return;
          if (!desktop()) { setBusy(false); setError('此入口仅支持官方桌面版 / Official Desktop required'); return; }
          const own = ++generation.current, controller = new AbortController(); abort.current = controller; pending.current = true; setBusy(true); setError('');
          try {
            const result = await api('/start', {}, controller.signal);
            if (own !== generation.current) return;
            if (result.status !== 'ready') throw new Error('服务未就绪 / Service is not ready');
            const url = new URL(result.url);
            if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/') throw new Error('Unexpected service URL');
            tab.actions.openTab('browser', { params: { url: url.href }, replaceTab: true });
          } catch (cause) { if (own === generation.current && cause.name !== 'AbortError') setError(String(cause.message || cause)); }
          finally { if (own === generation.current) { setBusy(false); pending.current = false; } }
        }
        React.useEffect(() => { void open(); return () => { generation.current++; pending.current = false; abort.current?.abort(); }; }, [tab.actions]);
        return h('div', { style: { padding: 20, lineHeight: 1.7 } },
          h('h3', null, 'DSH 酒馆桥 · Tavern Bridge'),
          error ? h(React.Fragment, null, h('p', { role: 'alert' }, error), h('p', null, '先安装酒馆，再到「设置 → DSH 酒馆桥」填写目录；共享 API 需单独启用。'), h('button', { type: 'button', disabled: busy, onClick: () => void open() }, '重试 / Retry')) : h('p', null, busy ? '正在检查并启动本机服务… / Starting local services…' : '正在右侧打开… / Opening right pane…'));
      }
      function TavernSettings() {
        const [state, setState] = React.useState(null), [draft, setDraft] = React.useState(null), [error, setError] = React.useState(''), [notice, setNotice] = React.useState(''), [busy, setBusy] = React.useState(false), [key, setKey] = React.useState(''), [guide, setGuide] = React.useState('');
        const live = React.useRef(false);
        React.useEffect(() => { const controller = new AbortController(); live.current = true; api('/state', {}, controller.signal).then(value => { if (live.current) { setState(value); setDraft(value.config); } }).catch(cause => { if (live.current && cause.name !== 'AbortError') setError(cause.message); }); return () => { live.current = false; controller.abort(); }; }, []);
        async function action(work) {
          if (busy) return; setBusy(true); setError(''); setNotice('');
          try { await work(); } catch (cause) { if (live.current) setError(cause.message || 'Request failed'); } finally { if (live.current) setBusy(false); }
        }
        async function refresh() { const next = await api('/state'); if (live.current) { setState(next); setDraft(next.config); } }
        const update = (name, value) => setDraft(current => ({ ...current, [name]: value }));
        const row = (label, name, type = 'text') => h('label', { style: { display: 'grid', gap: 6, marginBottom: 14 } }, label, h('input', { type, value: draft[name], disabled: busy, onChange: e => update(name, type === 'number' ? Number(e.target.value) : e.target.value), style: { width: '100%', padding: 8, boxSizing: 'border-box', background: 'var(--dsw-specific-input-major)', color: 'inherit', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 6 } }));
        if (!draft) return h('div', { style: { padding: 20 } }, error || '加载中… / Loading…');
        return h('div', { style: { padding: 12, lineHeight: 1.65, height: '100%', overflow: 'auto', boxSizing: 'border-box' } },
          h('h2', null, 'DSH 酒馆桥 · Tavern Bridge'),
          h('p', null, '前提：先自行下载、安装 SillyTavern 和 Node.js，完成依赖安装。本插件不下载或升级酒馆。 / Install SillyTavern, its dependencies and Node.js first.'),
          row('酒馆绝对目录 / SillyTavern absolute directory', 'tavernDirectory'), row('Node 可执行程序 / Node executable', 'nodeCommand'), row('酒馆端口 / Tavern port', 'tavernPort', 'number'), row('网关端口 / Gateway port', 'gatewayPort', 'number'),
          h('label', { style: { display: 'block', marginBottom: 12 } }, h('input', { type: 'checkbox', checked: draft.sharingEnabled, disabled: busy, onChange: e => update('sharingEnabled', e.target.checked) }), ' 明确授权共享 DSH 模型；请求可能计费 / Enable DSH model sharing; requests may incur charges'),
          h('label', { style: { display: 'grid', gap: 6, marginBottom: 12 } }, '共享提供方白名单，逗号分隔；留空表示所有已注册提供方 / Provider allowlist; empty means all registered providers', h('input', { value: draft.sharedProviders.join(', '), disabled: busy, onChange: e => update('sharedProviders', e.target.value.split(',').map(v => v.trim()).filter(Boolean)) })),
          h('p', null, '保存会关闭插件自己的网关；下一次点击酒馆入口重新启动。活跃模型请求期间拒绝保存。 / Saving closes this plugin’s gateway; reopen the Tavern entry to start it. Active model requests block saving.'),
          h('button', { type: 'button', disabled: busy, onClick: () => action(async () => { await api('/config', draft); setKey(''); await refresh(); if (live.current) setNotice('已保存；请点击右侧酒馆入口 / Saved; open the Tavern entry'); }) }, '保存 / Save'),
          h('h3', null, '共享模型 API / Shared model API'), h('p', null, '状态 / Status: ', state.gatewayRunning ? '已启动 / Running' : '未启动 / Stopped'), h('p', null, 'Base URL: ', h('code', null, state.gatewayBaseUrl)),
          h('p', null, '酒馆选择 Custom (OpenAI-compatible)，填写上述 Base URL 和本地网关密钥，再连接。不要填写真实上游密钥。 / In SillyTavern use Custom, this Base URL and the local gateway key, not your provider key.'),
          h('button', { type: 'button', disabled: busy || !state.config.sharingEnabled, onClick: () => action(async () => { const value = await api('/gateway-key'); if (live.current) setKey(value.key); }) }, '显示本地网关密钥 / Reveal local gateway key'),
          key ? h('div', null, h('input', { type: 'password', readOnly: true, value: key, onFocus: e => e.target.select(), 'aria-label': 'Local gateway key' }), h('button', { type: 'button', onClick: () => action(async () => { await navigator.clipboard.writeText(key); if (live.current) setNotice('已复制；请勿截图或上传 / Copied; do not screenshot or upload'); }) }, '复制 / Copy'), h('button', { type: 'button', onClick: () => setKey('') }, '隐藏 / Hide')) : null,
          h('h3', null, 'DSH 授权编辑酒馆 / Authorized workspace editing'), h('p', null, '将酒馆目录添加为 DSH 工作区。下方规范可手动合并到已有 AGENTS.md；不是 OS 沙箱，不会自动写入。 / Add the Tavern directory as a workspace; merge these instructions manually into AGENTS.md. This is not an OS sandbox or an automatic write.'),
          h('button', { type: 'button', disabled: busy, onClick: () => action(async () => { const value = await api('/workspace-guide', { language: 'zh' }); if (live.current) setGuide(value.text); }) }, '查看编辑规范 / View editing guide'), guide ? h('textarea', { readOnly: true, value: guide, rows: 12, style: { width: '100%', boxSizing: 'border-box' } }) : null,
          error ? h('p', { role: 'alert' }, error) : null, notice ? h('p', { role: 'status' }, notice) : null);
      }
      return {
        name: ID, inject: ['slots', 'sidebarRightTabs'],
        apply(ctx) {
          ctx.effect(() => ctx.sidebarRightTabs.register({ id: ID, kind: 'sillytavern', title: () => '酒馆', guide: [{ id: 'open', order: 40, title: () => '酒馆', description: () => '启动预装酒馆和已授权网关 / Start preinstalled SillyTavern and optional gateway' }] }), 'sillytavern-bridge.tab');
          ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: ID }, TavernEntry)), 'sillytavern-bridge.body');
          ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'sillytavern-bridge', order: 18, label: 'DSH 酒馆桥' }, TavernSettings)), 'sillytavern-bridge.settings');
        },
      };
    },
  });
})()
