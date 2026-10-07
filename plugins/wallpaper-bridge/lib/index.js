// dsh-skin-we host half: poll Wallpaper Engine state and expose it plus the
// wallpaper's files through the DSH Host used by Web and official Desktop.
import { promises as fsp, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { scanWe, resolveWallpaperFile, serveFile } from './we.js'

export const name = 'dsh-skin-we'

/** Services the host half needs. */
export const inject = ['webServer']

const POLL_MS = 750

/** Plugin-owned durable settings inside DSH home. The legacy APPDATA file is
 * read as a migration source but is never removed automatically. */
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const CONFIG_DIR = path.join(DSH_HOME, 'storages', 'we-skin')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const LEGACY_CONFIG_FILE = path.join(process.env.APPDATA || os.homedir(), 'dsh-skin-we', 'config.json')

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: 2,
  enabled: true,
  followWallpaperEngine: true,
  fit: 'cover',
  zoom: 1,
  positionX: 50,
  positionY: 50,
  surfaceTransparency: 36,
  blur: 4,
  themeStrength: 70,
  transitionMs: 400,
  muted: true,
  monitorMode: 'window',
  perWallpaper: {},
})

const FITS = new Set(['cover', 'contain', 'native', 'fill'])
const MONITOR_MODES = new Set(['window', 'primary', 'manual'])
const numberIn = (value, fallback, min, max) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function normalizeView(value = {}) {
  return {
    fit: FITS.has(value.fit) ? value.fit : DEFAULT_CONFIG.fit,
    zoom: numberIn(value.zoom, DEFAULT_CONFIG.zoom, 0.25, 4),
    positionX: numberIn(value.positionX, DEFAULT_CONFIG.positionX, 0, 100),
    positionY: numberIn(value.positionY, DEFAULT_CONFIG.positionY, 0, 100),
    surfaceTransparency: numberIn(value.surfaceTransparency, DEFAULT_CONFIG.surfaceTransparency, 0, 70),
    blur: numberIn(value.blur, DEFAULT_CONFIG.blur, 0, 30),
    themeStrength: numberIn(value.themeStrength, DEFAULT_CONFIG.themeStrength, 0, 100),
  }
}

export function normalizeConfig(value = {}) {
  const view = normalizeView(value)
  const perWallpaper = {}
  if (value.perWallpaper && typeof value.perWallpaper === 'object' && !Array.isArray(value.perWallpaper)) {
    for (const [id, item] of Object.entries(value.perWallpaper)) {
      if (typeof id === 'string' && id.length <= 160 && !['__proto__', 'prototype', 'constructor'].includes(id) && item && typeof item === 'object') {
        perWallpaper[id] = normalizeView(item)
      }
    }
  }
  return {
    ...DEFAULT_CONFIG,
    ...view,
    schemaVersion: 2,
    enabled: value.enabled !== false,
    followWallpaperEngine: value.followWallpaperEngine !== false,
    transitionMs: numberIn(value.transitionMs, DEFAULT_CONFIG.transitionMs, 0, 1500),
    muted: value.muted !== false,
    monitorMode: MONITOR_MODES.has(value.monitorMode) ? value.monitorMode : DEFAULT_CONFIG.monitorMode,
    manualMonitor: typeof value.manualMonitor === 'string' ? value.manualMonitor.slice(0, 80) : '',
    perWallpaper,
  }
}

async function readConfig() {
  for (const file of [CONFIG_FILE, LEGACY_CONFIG_FILE]) {
    try {
      const raw = await fsp.readFile(file, 'utf8')
      return normalizeConfig(JSON.parse(raw))
    } catch {
      // Try the migration source, then defaults.
    }
  }
  return normalizeConfig()
}

async function writeConfig(cfg) {
  await fsp.mkdir(CONFIG_DIR, { recursive: true })
  const normalized = normalizeConfig(cfg)
  const pending = CONFIG_FILE + '.tmp'
  await fsp.writeFile(pending, JSON.stringify(normalized, null, 2) + '\n', 'utf8')
  await fsp.rename(pending, CONFIG_FILE)
  return normalized
}

/** Read the request body of a small POST as text (bounded). */
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(payload))
}

/** WE web-wallpaper API stubs, fed with the wallpaper's default properties. */
function polyfillScript(state) {
  const defaults = JSON.stringify(state.properties ?? {}).replace(/</g, '\\u003c')
  return `<script>
window.__weSkinDefaults = ${defaults};
window.wallpaperPropertyListener = {
  applyUserProperties: function (p) {},
  applyGeneralProperties: function (p) {},
};
(function () {
  var apply = function () {
    try {
      var listener = window.wallpaperPropertyListener;
      if (listener && typeof listener.applyUserProperties === 'function') {
        listener.applyUserProperties(window.__weSkinDefaults || {});
      }
    } catch (e) {}
  };
  window.addEventListener('load', apply);
  setTimeout(apply, 400);
  setTimeout(apply, 1200);
})();
window.wallpaperRegisterAudioListener = function (fn) {
  try { fn({ audioPlaybackState: 1 }) } catch (e) {}
};
window.wallpaperRequestRandomFileForProperty = function (prop, cb, type) {
  try { cb('') } catch (e) {}
};
</script>`
}

function serveWebHtml(absPath, state, res) {
  fsp.readFile(absPath, 'utf8')
    .then((html) => {
      const injected = html.replace(/<head([^>]*)>/i, (m) => m + polyfillScript(state))
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "sandbox allow-scripts; connect-src 'none'; form-action 'none'",
        'X-Content-Type-Options': 'nosniff',
      })
      res.end(injected)
    })
    .catch((e) => {
      res.writeHead(500)
      res.end(String(e && e.message))
    })
}

export function apply(ctx) {
  let state = { ok: false, error: 'not scanned yet', revision: 0 }
  let config = normalizeConfig()
  const eventClients = new Set()
  const artInfo = { id: null, art: false, artPath: null }
  let stateSignature = ''

  // This plugin exposes local wallpaper files, not a remote sharing service.
  // IPC requests have no socket; real HTTP requests must originate on loopback.
  const register = (route) => ctx.webServer.register({
    ...route,
    handler: (req, res) => {
      const peer = req.socket?.remoteAddress
      if (peer && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer)) {
        sendJson(res, 403, { error: 'Local desktop access only' })
        return
      }
      return route.handler(req, res)
    },
  })

  const publish = (event, payload) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
    for (const res of [...eventClients]) {
      try {
        res.write(message)
      } catch {
        eventClients.delete(res)
      }
    }
  }

  const setState = (next) => {
    const signature = JSON.stringify({
      ok: next.ok,
      error: next.error,
      file: next.file,
      id: next.id,
      monitor: next.monitor,
      type: next.type,
      entry: next.entry,
      preview: next.preview,
      schemeColor: next.schemeColor,
      art: next.art,
    })
    if (signature === stateSignature) return
    stateSignature = signature
    state = { ...next, revision: (state.revision || 0) + 1, observedAt: Date.now() }
    publish('wallpaper', state)
  }

  async function refresh() {
    try {
      const scanned = await scanWe()
      // For scene wallpapers: pull the FULL original artwork out of scene.pkg
      // (the workshop preview.jpg is a cropped 1024x1024 square). The art info
      // lives OUTSIDE the scanned object: every 2s poll replaces `state` with
      // a fresh scan, which must not wipe these fields.
      if (scanned.ok && (scanned.type === 'scene' || scanned.type === 'unknown')) {
        if (artInfo.id !== scanned.id) {
          artInfo.id = scanned.id
          artInfo.art = false
          artInfo.artPath = null
          try {
            const { extractSceneArt } = await import('./art.js')
            const p = await extractSceneArt(scanned.file, scanned.id)
            if (p) {
              artInfo.artPath = p
              artInfo.art = true
            }
          } catch {
            artInfo.art = false
          }
        }
      } else {
        artInfo.id = null
        artInfo.art = false
        artInfo.artPath = null
      }
      scanned.art = artInfo.art
      scanned.artPath = artInfo.artPath
      setState(scanned)
    } catch (error) {
      setState({ ok: false, error: String((error && error.message) || error) })
    }
  }

  ctx.effect(() => {
    let disposed = false
    readConfig().then((loaded) => {
      if (!disposed) config = loaded
    })
    return () => { disposed = true }
  }, 'dsh-skin-we: load config')

  // Current wallpaper state (also pushed through /events).
  ctx.effect(
    () => register({
      kind: 'exact',
      path: '/we-skin/state',
      handler: (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(state))
      },
    }),
    'dsh-skin-we: /we-skin/state route',
  )

  ctx.effect(
    () => register({
      kind: 'exact',
      path: '/we-skin/events',
      handler: (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })
        res.write(`event: ready\ndata: ${JSON.stringify({ state, config })}\n\n`)
        eventClients.add(res)
        const keepAlive = setInterval(() => {
          try { res.write(': keepalive\n\n') } catch { eventClients.delete(res) }
        }, 20_000)
        req.on('close', () => {
          clearInterval(keepAlive)
          eventClients.delete(res)
        })
      },
    }),
    'dsh-skin-we: /we-skin/events route',
  )

  // The extracted full-resolution artwork (scene.pkg -> cache png).
  ctx.effect(
    () => register({
      kind: 'exact',
      path: '/we-skin/art',
      handler: (_req, res) => {
        if (!artInfo.art || !artInfo.artPath) {
          res.writeHead(404)
          res.end('no artwork extracted yet')
          return
        }
        serveFile(artInfo.artPath, _req, res)
      },
    }),
    'dsh-skin-we: /we-skin/art route',
  )

  // Durable skin settings shared by Web and desktop-shell clients.
  ctx.effect(
    () => register({
      kind: 'exact',
      path: '/we-skin/config',
      handler: async (req, res) => {
        try {
          if (req.method === 'POST') {
            if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
              sendJson(res, 415, { error: 'application/json required' })
              return
            }
            const origin = req.headers.origin
            if (req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== 'dsh-app://app' && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`)) {
              sendJson(res, 403, { error: 'Same-origin settings access only' })
              return
            }
            const body = JSON.parse((await readBody(req)) || '{}')
            config = await writeConfig({ ...config, ...body })
            publish('config', config)
            sendJson(res, 200, { ok: true, config })
            return
          }
          config = await readConfig()
          sendJson(res, 200, { ok: true, config })
        } catch (error) {
          sendJson(res, 400, { error: String((error && error.message) || error) })
        }
      },
    }),
    'dsh-skin-we: /we-skin/config route',
  )

  // Compatibility endpoint only. Plugin lifecycle is owned by “我的插件”.
  ctx.effect(
    () => register({
      kind: 'exact',
      path: '/we-skin/uninstall',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' })
          return
        }
        sendJson(res, 409, { error: '请在 DSH 左侧「插件」页面停用或卸载该插件' })
      },
    }),
    'dsh-skin-we: /we-skin/uninstall route',
  )

  ctx.effect(
    () => register({
      kind: 'exact',
      path: '/we-skin/health',
      handler: (_req, res) => sendJson(res, 200, {
        ok: true,
        plugin: name,
        version: '0.3.6-dsh020rc2.1',
        pollMs: POLL_MS,
        eventClients: eventClients.size,
        configFile: CONFIG_FILE,
        legacyConfigDetected: existsSync(LEGACY_CONFIG_FILE),
        wallpaper: state,
      }),
    }),
    'dsh-skin-we: /we-skin/health route',
  )

  // Every file inside the active wallpaper's workshop folder
  // (preview.jpg, the video entry, web wallpaper assets, ...).
  ctx.effect(
    () => register({
      kind: 'prefix',
      path: '/we-skin/web',
      handler: (req, res) => {
        if (!state.ok || !state.dir) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(state))
          return
        }
        const url = new URL(req.url ?? '/', 'https://example.invalid')
        const rel = url.pathname.slice('/we-skin/web'.length)
        const abs = resolveWallpaperFile(state.dir, rel)
        if (!abs) {
          res.writeHead(404)
          res.end('not found')
          return
        }
        if (path.extname(abs).toLowerCase() === '.html') {
          serveWebHtml(abs, state, res)
          return
        }
        serveFile(abs, req, res)
      },
    }),
    'dsh-skin-we: /we-skin/web files route',
  )

  // Keep the wallpaper state fresh.
  ctx.effect(
    () => {
      refresh()
      const timer = setInterval(refresh, POLL_MS)
      return () => {
        clearInterval(timer)
        for (const res of eventClients) {
          try { res.end() } catch { /* already closed */ }
        }
        eventClients.clear()
      }
    },
    'dsh-skin-we: wallpaper config poll',
  )
}
