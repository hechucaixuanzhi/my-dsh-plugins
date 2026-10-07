// Wallpaper Engine discovery: find the WE install, parse config.json for the
// active wallpaper, resolve its workshop folder and project.json. Pure Node —
// no DSH imports, so it can be tested standalone.
import { existsSync, promises as fsp, createReadStream, statSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const WORKSHOP_APP_ID = '431960'

export const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml',
}

/** Steam root from the registry, or null. */
export function steamPathFromRegistry() {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
    })
    const m = out.match(/REG_SZ\s+(.+?)\s*$/)
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

/** Locate wallpaper_engine/config.json; env DSH_WE_CONFIG wins. */
export function findWeConfig() {
  const directCandidates = []
  if (process.env.DSH_WE_CONFIG) directCandidates.push(process.env.DSH_WE_CONFIG)
  directCandidates.push('C:\\Program Files (x86)\\Steam\\steamapps\\common\\wallpaper_engine\\config.json')
  directCandidates.push('D:\\Steam\\steamapps\\common\\wallpaper_engine\\config.json')

  const direct = directCandidates.find((p) => existsSync(p))
  if (direct) return direct

  const candidates = []
  const steam = steamPathFromRegistry()
  if (steam) {
    candidates.push(path.join(steam, 'steamapps', 'common', 'wallpaper_engine', 'config.json'))
  }
  return candidates.find((p) => existsSync(p)) ?? null
}

function readJson(text) {
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

/**
 * Read the active wallpaper state.
 * @returns {{ok:boolean, error?:string, file?:string, dir?:string, id?:string,
 *            type?:string, title?:string, entry?:string, preview?:string,
 *            schemeColor?:string, monitor?:string}}
 */
export async function scanWe() {
  const cfgPath = findWeConfig()
  if (!cfgPath) return { ok: false, error: 'wallpaper_engine/config.json not found' }
  let raw
  try {
    raw = readJson(await fsp.readFile(cfgPath, 'utf8'))
  } catch (e) {
    return { ok: false, error: `config.json unreadable: ${e.message}` }
  }
  // config.json is keyed by Windows account; the first non-meta key owns state
  const userKey = Object.keys(raw).find((k) => !k.startsWith('?'))
  const selected = raw?.[userKey]?.general?.wallpaperconfig?.selectedwallpapers ?? {}
  const entries = Object.entries(selected).filter(([, v]) => v && v.file)
  if (!entries.length) return { ok: false, error: 'no active wallpaper entry in config.json' }
  const [monitor, sel] = entries.find(([k]) => /^Monitor\d+$/.test(k)) ?? entries[0]
  const file = String(sel.file)
  const dir = path.dirname(file)
  const id = path.basename(dir)

  let type = 'unknown'
  let title = ''
  let entry = ''
  let preview = 'preview.jpg'
  let schemeColor = null
  let properties = {}
  const projPath = path.join(dir, 'project.json')
  if (existsSync(projPath)) {
    try {
      const proj = readJson(await fsp.readFile(projPath, 'utf8'))
      type = proj.type ?? type
      title = proj.title ?? title
      entry = proj.file ?? entry
      preview = proj.preview ?? preview
      const sc = proj?.general?.properties?.schemecolor?.value
      if (typeof sc === 'string') {
        const rgb = sc.trim().split(/\s+/).map((v) => Math.round(Number(v) * 255))
        if (rgb.length === 3 && rgb.every((v) => Number.isFinite(v))) {
          schemeColor = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')
        }
      }
      const props = proj?.general?.properties ?? {}
      for (const [key, def] of Object.entries(props)) {
        if (def && typeof def === 'object' && 'value' in def && def.value !== null && def.value !== undefined) {
          properties[key] = def.value
        }
      }
    } catch {
      /* keep defaults */
    }
  }
  if (!type || type === 'unknown') {
    if (file.endsWith('scene.pkg')) type = 'scene'
    else if (file.endsWith('index.html')) type = 'web'
  }
  if (!entry) entry = path.basename(file)
  return { ok: true, file, dir, id, monitor, type, title, entry, preview, schemeColor, properties, configPath: cfgPath }
}

/** Resolve a request path inside the wallpaper folder, rejecting traversal. */
export function resolveWallpaperFile(dir, rel) {
  if (typeof rel !== 'string' || rel.includes('\0')) return null
  let root
  try { root = realpathSync(dir) } catch { return null }
  let decoded
  try {
    decoded = decodeURIComponent(rel)
  } catch {
    return null
  }
  // Check the real target too: a symlink/junction must not escape the folder.
  let abs
  try { abs = realpathSync(path.resolve(root, '.' + path.posix.normalize('/' + decoded))) } catch { return null }
  if (abs !== root && !abs.startsWith(root + path.sep)) return null
  if (!statSync(abs).isFile()) return null
  return abs
}

/** Minimal HTTP Range-aware file responder for video streaming. */
export function serveFile(absPath, req, res) {
  const ext = path.extname(absPath).toLowerCase()
  const type = CONTENT_TYPES[ext] ?? 'application/octet-stream'
  let stat
  try { stat = statSync(absPath) } catch { res.writeHead(404); res.end(); return }
  if (!stat.isFile()) { res.writeHead(404); res.end(); return }
  const size = stat.size
  const range = req.headers.range
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Type', type)
  if (range && /^bytes=/.test(range)) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (m && (m[1] || m[2])) {
      const suffix = !m[1]
      const start = suffix ? Math.max(0, size - Number(m[2])) : Number(m[1])
      const end = suffix || !m[2] ? size - 1 : Math.min(Number(m[2]), size - 1)
      if (Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size && (!suffix || Number(m[2]) > 0)) {
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': end - start + 1,
        })
        if (req.method === 'HEAD') { res.end(); return }
        const stream = createReadStream(absPath, { start, end })
        stream.on('error', () => res.destroy())
        stream.pipe(res)
        return
      }
    }
    res.writeHead(416, { 'Content-Range': `bytes */${size}` })
    res.end()
    return
  }
  res.setHeader('Content-Length', size)
  if (req.method === 'HEAD') { res.end(); return }
  const stream = createReadStream(absPath)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}
