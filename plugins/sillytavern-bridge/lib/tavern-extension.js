// DSH Tavern Bridge managed extension. No credentials are embedded in this file.
export function readHandoff(hash) {
  const match = /^#dsh-bridge=(\d{4,5})\.([a-f0-9]{64})$/.exec(hash);
  if (!match || Number(match[1]) < 1024 || Number(match[1]) > 65535) return null;
  return { port: Number(match[1]), token: match[2] };
}

export async function connectTavern({ handoff, fetchPage, native, ui, digest }) {
  const base = `http://${'127.0.0.1'}:${handoff.port}`;
  const response = await fetchPage(base + '/bridge/connect', {
    method: 'POST', headers: { Authorization: `Bearer ${handoff.token}` },
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('DSH connection handoff expired or unavailable');
  const payload = await response.json();
  if (!/^[a-f0-9]{64}$/.test(payload.key) || !Array.isArray(payload.models) || !payload.models.length || payload.models.some(m => typeof m.id !== 'string' || !m.id.includes('/'))) throw new Error('DSH has no usable shared models');
  const { settings, power, extensions } = native;
  const names = ['chat_completion_source', 'custom_url', 'custom_model', 'custom_include_headers', 'custom_include_body', 'custom_exclude_body'];
  const fingerprint = await digest(payload.key);
  const saved = extensions.dsh_tavern_bridge ||= {};
  const active = native.customSecrets().find(secret => secret.active);
  if (!saved.previousConnection) {
    saved.previousConnection = {
      main_api: native.mainApi(), auto_connect: power.auto_connect,
      settings: Object.fromEntries(names.filter(name => Object.hasOwn(settings, name)).map(name => [name, settings[name]])),
      secretId: active?.id || null,
    };
    // Save the recovery snapshot before changing the selected key or connection.
    await native.save();
  }
  if (saved.keyFingerprint !== fingerprint || saved.keyId !== active?.id) {
    const id = await native.writeKey(payload.key);
    if (!id) throw new Error('Could not save the local DSH gateway key');
    saved.keyId = id; saved.keyFingerprint = fingerprint;
  }
  const selected = payload.models.some(m => m.id === settings.custom_model) ? settings.custom_model : payload.models[0].id;
  Object.assign(settings, {
    chat_completion_source: 'custom', custom_url: base + '/v1', custom_model: selected,
    custom_include_headers: '', custom_include_body: '', custom_exclude_body: '',
  });
  power.auto_connect = true;
  // Populate all fields before source-change handlers can start a status request.
  ui.prepare(settings);
  ui.select();
  await native.save();
  await native.verify(settings.custom_url, selected);
  ui.connect();
}

if (typeof window !== 'undefined' && typeof SillyTavern !== 'undefined') {
    const modules = Promise.all([
      import('/script.js'), import('/scripts/openai.js'), import('/scripts/power-user.js'),
      import('/scripts/extensions.js'), import('/scripts/secrets.js'),
    ]);
    const context = SillyTavern.getContext();
    const ready = new Promise(resolve => context.eventSource.once(context.eventTypes.APP_READY, resolve));
    let pending = Promise.resolve();
    function schedule() {
      const handoff = readHandoff(location.hash);
      if (!handoff) return;
      // A URL fragment is never sent to Tavern's HTTP server. Remove it promptly.
      history.replaceState(null, '', location.pathname + location.search);
      pending = pending.then(async () => {
      try {
        await ready;
        const [app, openai, power, extensions, secrets] = await modules;
        const request = async (route, body = {}) => {
          const response = await fetch(route, { method: 'POST', headers: app.getRequestHeaders(), body: JSON.stringify(body), cache: 'no-store' });
          if (!response.ok) throw new Error('Tavern settings request failed');
          return response.json();
        };
        await connectTavern({ handoff, fetchPage: fetch,
          digest: async key => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))].map(b => b.toString(16).padStart(2, '0')).join(''),
          native: {
            settings: openai.oai_settings, power: power.power_user, extensions: extensions.extension_settings,
            mainApi: () => app.main_api, customSecrets: () => secrets.secret_state[secrets.SECRET_KEYS.CUSTOM] || [],
            writeKey: key => secrets.writeSecret(secrets.SECRET_KEYS.CUSTOM, key, 'DSH Tavern Bridge'),
            save: async () => {
              await app.saveSettings();
              const result = await request('/api/settings/get');
              const value = JSON.parse(result.settings);
              if (!value.extension_settings?.dsh_tavern_bridge?.previousConnection || JSON.stringify(value.extension_settings.dsh_tavern_bridge) !== JSON.stringify(extensions.extension_settings.dsh_tavern_bridge)) throw new Error('Recovery snapshot or key reference was not saved');
            },
            verify: async (url, model) => {
              const value = JSON.parse((await request('/api/settings/get')).settings);
              if (value.main_api !== 'openai' || value.oai_settings?.chat_completion_source !== 'custom' || value.oai_settings?.custom_url !== url || value.oai_settings?.custom_model !== model || value.power_user?.auto_connect !== true) throw new Error('DSH connection settings were not saved');
            },
          },
          ui: {
            prepare: settings => {
              $('#custom_api_url_text').val(settings.custom_url);
              $('#custom_model_id').val(settings.custom_model);
              $('#custom_include_headers, #custom_include_body, #custom_exclude_body, #api_key_custom').val('');
              $('#auto-connect-checkbox').prop('checked', true);
            },
            select: () => { $('#main_api').val('openai').trigger('change'); $('#chat_completion_source').val('custom').trigger('change'); },
            connect: () => $('#api_button_openai').trigger('click'),
          },
        });
      } catch {
        toastr.error('DSH API 自动连接失败。请重新从 DSH 打开酒馆，检查模型共享、扩展及连接设置。 / DSH auto-connect failed. Reopen Tavern from DSH and check sharing, extensions and connection settings.', 'DSH Tavern Bridge', { timeOut: 0, extendedTimeOut: 0 });
      }
      });
    }
    // Reopening an existing Browser tab can be same-document navigation.
    window.addEventListener('hashchange', schedule);
    schedule();
}
