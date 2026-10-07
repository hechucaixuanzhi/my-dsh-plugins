/**
 * dsh-skin-we browser half.
 * Shared state/theme controller with Web media and desktop-shell backends.
 */
window.__ModuleLoader__.load({
  id: '@dsh-local/we-skin',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement
    const { useSyncExternalStore } = React
    const SKIN = 'dsh-skin-we'
    const API = '/we-skin'
    const STYLE_ID = 'dsh-skin-we-style'
    const BACKGROUND_ID = 'dsh-skin-we-background'
    const DEFAULT_CONFIG = {
      enabled: true, followWallpaperEngine: true, fit: 'cover', zoom: 1,
      positionX: 50, positionY: 50, surfaceTransparency: 36, blur: 4,
      themeStrength: 70, transitionMs: 400, muted: true,
      monitorMode: 'window', perWallpaper: {},
    }
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
    const rgba = (r, g, b, a) => `rgba(${r} ${g} ${b} / ${a})`

    function isShellMode() {
      try {
        return new URLSearchParams(location.search).has('skin') || /WeShell/i.test(navigator.userAgent)
      } catch { return false }
    }

    function isOfficialDesktop() {
      return location.protocol === 'dsh-app:'
    }

    // Electron's dsh-app forwarder does not preserve the response length of
    // streamed media. Use the Host's advertised loopback origin for video so
    // Chromium can make byte-range requests and loop the wallpaper reliably.
    function desktopMediaUrl(relativeUrl) {
      if (!isOfficialDesktop()) return relativeUrl
      try {
        const base = window.__DSH_TRANSPORT__?.streamBaseUrl
        const origin = new URL(base)
        if (!['http:', 'https:'].includes(origin.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) return relativeUrl
        return new URL(relativeUrl, origin).href
      } catch { return relativeUrl }
    }

    async function fetchJson(url, options) {
      const res = await fetch(url, { cache: 'no-store', ...options })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`)
      return body
    }

    function effectiveConfig(config, wallpaper) {
      const wallpaperId = wallpaper && wallpaper.id
      const per = wallpaperId && config.perWallpaper && config.perWallpaper[wallpaperId]
      // A scene preview is normally a square workshop thumbnail, while the
      // rendered desktop scene is often 16:9 or ultrawide. Cropping that
      // thumbnail with `cover` makes the DSH view look unrelated to the
      // desktop. Until the source artwork is available, show the complete
      // preview and fill the remaining viewport with a softened copy.
      const scenePreviewFallback = wallpaper && wallpaper.type === 'scene' && !wallpaper.art && !per
        ? { fit: 'contain', zoom: 1, positionX: 50, positionY: 50 }
        : {}
      return { ...DEFAULT_CONFIG, ...config, ...scenePreviewFallback, ...(per || {}) }
    }

    function ensureStyle() {
      let style = document.getElementById(STYLE_ID)
      if (style) return style
      style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
body.dsh-we-skin-active{background:transparent!important}
body.dsh-we-skin-active>#root{position:relative;z-index:1;background:transparent!important}
#${BACKGROUND_ID}{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#07090d}
#${BACKGROUND_ID} .we-layer{position:absolute;inset:0;opacity:0;transition-property:opacity;transition-timing-function:ease;overflow:hidden}
#${BACKGROUND_ID} .we-layer.is-visible{opacity:1}
#${BACKGROUND_ID} img,#${BACKGROUND_ID} video,#${BACKGROUND_ID} iframe{position:absolute;inset:0;width:100%;height:100%;border:0;transform-origin:center;filter:none!important;-webkit-filter:none!important}
#${BACKGROUND_ID} .we-static-fill{object-fit:cover!important;transform:scale(1.14)!important;filter:blur(28px) saturate(1.08)!important;-webkit-filter:blur(28px) saturate(1.08)!important;opacity:.72}
body.dsh-we-skin-active{color:var(--dsw-alias-label-primary);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
body.dsh-we-skin-active button,body.dsh-we-skin-active input,body.dsh-we-skin-active textarea,body.dsh-we-skin-active select{color:var(--dsw-alias-label-primary)}
body.dsh-we-skin-active [data-we-layer="sidebar"]{box-shadow:1px 0 0 var(--dsw-alias-border-l1),8px 0 28px rgba(0 0 0 / .12)}
body.dsh-we-skin-active [data-we-glass="header"]{backdrop-filter:blur(var(--we-skin-blur-soft,1.5px)) saturate(1.04);-webkit-backdrop-filter:blur(var(--we-skin-blur-soft,1.5px)) saturate(1.04);box-shadow:0 1px 0 var(--dsw-alias-border-l1)}
body.dsh-we-skin-active [data-we-glass="composer"],body.dsh-we-skin-active [data-we-glass="surface"]{backdrop-filter:blur(var(--we-skin-blur-component,2.5px)) saturate(1.06);-webkit-backdrop-filter:blur(var(--we-skin-blur-component,2.5px)) saturate(1.06);box-shadow:0 8px 28px rgba(0 0 0 / .16),inset 0 0 0 1px var(--dsw-alias-border-l1)}
.we-settings{height:100%;overflow:auto;padding:8px 4px 28px;color:var(--dsw-alias-label-primary);font-family:inherit}
.we-settings h2{margin:0 0 6px;font-size:20px}.we-settings .we-sub{margin:0 0 18px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.6}
.we-settings .we-card{margin:0 0 14px;padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.we-settings .we-card h3{margin:0 0 12px;font-size:15px}.we-settings .we-row{display:grid;grid-template-columns:minmax(130px,190px) minmax(180px,1fr) 66px;align-items:center;gap:12px;min-height:38px}
.we-settings .we-row label{color:var(--dsw-alias-label-secondary);font-size:13px}.we-settings .we-row input[type="range"]{width:100%;accent-color:var(--dsw-alias-brand-primary)}
.we-settings .we-row select,.we-settings button{color:var(--dsw-alias-label-primary);background:var(--dsw-specific-selector);border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:6px 9px;font:inherit}
.we-settings .we-value{text-align:right;color:var(--dsw-alias-label-tertiary);font-size:12px;font-variant-numeric:tabular-nums}.we-settings .we-switch{display:flex;align-items:center;gap:9px;grid-column:2/4}
.we-settings .we-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.we-settings .we-health{font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}.we-settings .we-error{color:var(--dsw-alias-status-error,#d94a4a)}
@media(max-width:720px){.we-settings .we-row{grid-template-columns:1fr 80px}.we-settings .we-row label{grid-column:1/3}.we-settings .we-switch{grid-column:1/3}}
`
      document.head.appendChild(style)
      return style
    }

    function ensureBackground() {
      if (isShellMode()) return null
      let node = document.getElementById(BACKGROUND_ID)
      if (!node) {
        node = document.createElement('div')
        node.id = BACKGROUND_ID
        document.body.appendChild(node)
      }
      return node
    }

    function mediaUrl(state) {
      if (state.type === 'scene' && state.art) return `${API}/art?r=${state.revision || 0}`
      if (state.type === 'video' || state.type === 'web' || state.type === 'image') {
        const url = `${API}/web/${encodeURIComponent(state.entry || '')}`
        return state.type === 'video' ? desktopMediaUrl(url) : url
      }
      return `${API}/web/${encodeURIComponent(state.preview || 'preview.jpg')}`
    }

    function fitValue(fit) {
      return fit === 'contain' ? 'contain' : fit === 'native' ? 'none' : fit === 'fill' ? 'fill' : 'cover'
    }

    function styleMedia(media, config, isFrame) {
      media.style.objectFit = fitValue(config.fit)
      media.style.objectPosition = `${config.positionX}% ${config.positionY}%`
      media.style.transform = `scale(${config.zoom})`
      media.style.transformOrigin = `${config.positionX}% ${config.positionY}%`
      if (isFrame) {
        media.style.width = `${100 / config.zoom}%`
        media.style.height = `${100 / config.zoom}%`
        media.style.left = `${50 - 50 / config.zoom}%`
        media.style.top = `${50 - 50 / config.zoom}%`
      }
    }

    function createMedia(state, config) {
      let media
      if (state.type === 'video') {
        media = document.createElement('video')
        media.autoplay = true; media.loop = true; media.playsInline = true
        media.muted = config.muted !== false
      } else if (state.type === 'web') {
        media = document.createElement('iframe')
        // Do not give workshop JavaScript access to DSH's origin or parent DOM.
        media.setAttribute('sandbox', 'allow-scripts')
        media.referrerPolicy = 'no-referrer'
      } else {
        media = document.createElement('img')
        media.alt = ''; media.decoding = 'async'
      }
      styleMedia(media, config, state.type === 'web')
      media.src = mediaUrl(state)
      return media
    }

    function needsStaticFill(state, config) {
      return state && state.type === 'scene' && !state.art && (config.fit === 'contain' || config.fit === 'native')
    }

    function addStaticFill(layer, state, config) {
      if (!needsStaticFill(state, config)) return
      const fill = document.createElement('img')
      fill.className = 'we-static-fill'
      fill.alt = ''
      fill.decoding = 'async'
      fill.src = mediaUrl(state)
      fill.style.objectPosition = `${config.positionX}% ${config.positionY}%`
      layer.appendChild(fill)
    }

    function hexToRgb(hex) {
      const match = /^#?([0-9a-f]{6})$/i.exec(hex || '')
      if (!match) return null
      const n = Number.parseInt(match[1], 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }

    function luminance(rgb) {
      const f = value => { const n = value / 255; return n <= .03928 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4) }
      return .2126 * f(rgb[0]) + .7152 * f(rgb[1]) + .0722 * f(rgb[2])
    }
    function contrast(a, b) {
      const la = luminance(a); const lb = luminance(b)
      return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05)
    }
    function pickInk(background) {
      const dark = [18, 20, 25]; const light = [242, 245, 250]
      return contrast(dark, background) >= contrast(light, background) ? dark : light
    }

    async function samplePalette(state) {
      if (!state || !state.ok) return null
      return new Promise(resolve => {
        const image = new Image()
        image.onload = () => {
          try {
            const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 48
            const context = canvas.getContext('2d', { willReadFrequently: true })
            context.drawImage(image, 0, 0, 48, 48)
            const pixels = context.getImageData(0, 0, 48, 48).data
            let r = 0; let g = 0; let b = 0; let count = 0; let best = null; let bestScore = -1
            for (let i = 0; i < pixels.length; i += 16) {
              if (pixels[i + 3] < 128) continue
              const color = [pixels[i], pixels[i + 1], pixels[i + 2]]
              r += color[0]; g += color[1]; b += color[2]; count += 1
              const spread = Math.max(...color) - Math.min(...color)
              const brightness = (color[0] + color[1] + color[2]) / 3
              const score = spread - Math.abs(brightness - 130) * .22
              if (score > bestScore) { bestScore = score; best = color }
            }
            resolve(count ? { average: [Math.round(r / count), Math.round(g / count), Math.round(b / count)], accent: best } : null)
          } catch (error) {
            console.warn('[dsh-skin-we] palette sampling failed', error); resolve(null)
          }
        }
        image.onerror = () => resolve(null)
        image.src = state.preview ? `${API}/web/${encodeURIComponent(state.preview)}` : mediaUrl(state)
      })
    }

    function buildOverrides(state, palette, config) {
      const base = (palette && palette.average) || hexToRgb(state.schemeColor) || [18, 24, 34]
      const accent = (palette && palette.accent) || hexToRgb(state.schemeColor) || [65, 118, 230]
      const strength = clamp(config.themeStrength / 100, 0, 1)
      const reveal = clamp(config.surfaceTransparency / 100, 0, .7)
      const panelAlpha = clamp(.62 - reveal * .85, .16, .62)
      const sidebarAlpha = clamp(panelAlpha + .13, .28, .72)
      const raisedAlpha = clamp(panelAlpha + .1, .3, .76)
      const inputAlpha = clamp(panelAlpha + .22, .42, .82)
      const darkBase = base.map(value => Math.round(value * .34 + 8))
      const lightInk = [22, 29, 41]; const lightSecondary = [67, 78, 95]; const lightTertiary = [94, 106, 124]
      const darkInk = [230, 226, 233]; const darkSecondary = [191, 186, 201]; const darkTertiary = [153, 150, 167]
      const brand = accent.map((value, index) => clamp(Math.round(65 * (1 - strength) + value * strength + (index === 2 ? 10 : 0)), 0, 255))
      const light = rgba(255, 255, 255, panelAlpha); const dark = rgba(darkBase[0], darkBase[1], darkBase[2], panelAlpha)
      const lightRaised = rgba(255,255,255,raisedAlpha); const darkRaised = rgba(darkBase[0],darkBase[1],darkBase[2],raisedAlpha)
      const lightInput = rgba(255,255,255,inputAlpha); const darkInput = rgba(darkBase[0],darkBase[1],darkBase[2],inputAlpha)
      const pair = (a, b) => ({ light: a, dark: b })
      return {
        '--dsw-alias-bg-base': pair('rgba(255 255 255 / .04)', 'rgba(0 0 0 / .04)'),
        '--dsw-alias-bg-layer-1': pair(light, dark),
        '--dsw-alias-bg-layer-2': pair(lightRaised, darkRaised),
        '--dsw-alias-bg-layer-3': pair(lightInput, darkInput),
        '--dsw-alias-bg-overlay': pair('rgba(255 255 255 / .94)', rgba(darkBase[0],darkBase[1],darkBase[2],.95)),
        '--dsw-specific-sidebar-fill': pair(rgba(255,255,255,sidebarAlpha), rgba(darkBase[0],darkBase[1],darkBase[2],sidebarAlpha)),
        '--dsw-specific-bubble': pair(light, dark),
        '--dsw-specific-bubble-highlight': pair(rgba(225,236,255,raisedAlpha), rgba(darkBase[0]+10,darkBase[1]+10,darkBase[2]+10,raisedAlpha)),
        '--dsw-specific-input-major': pair(lightInput, darkInput), '--dsw-specific-selector': pair(lightRaised, darkRaised),
        '--dsw-specific-menu': pair('rgba(255 255 255 / .94)', rgba(darkBase[0],darkBase[1],darkBase[2],.95)),
        '--dsw-specific-sidebar-nav-item-active': pair(rgba(accent[0],accent[1],accent[2],.16), rgba(accent[0],accent[1],accent[2],.25)),
        '--dsw-specific-sidebar-nav-item-hover': pair('rgba(0 0 0 / .06)', 'rgba(255 255 255 / .09)'),
        '--dsw-specific-tip': pair(light, dark), '--dsw-alias-bg-module-platform': pair(light, dark),
        '--dsw-alias-markdown-code-block': pair('rgba(249 250 251 / .78)', 'rgba(22 24 29 / .78)'),
        '--dsw-alias-markdown-code-block-banner': pair('rgba(249 250 251 / .86)', 'rgba(32 34 40 / .86)'),
        '--dsw-alias-markdown-inline-code': pair('rgba(20 28 40 / .09)', 'rgba(255 255 255 / .13)'),
        '--dsw-alias-label-primary': pair(`rgb(${lightInk.join(' ')})`, `rgb(${darkInk.join(' ')})`),
        '--dsw-alias-label-secondary': pair(`rgb(${lightSecondary.join(' ')})`, `rgb(${darkSecondary.join(' ')})`),
        '--dsw-alias-label-tertiary': pair(`rgb(${lightTertiary.join(' ')})`, `rgb(${darkTertiary.join(' ')})`),
        '--dsw-alias-label-dimmed': pair('rgb(116 126 142)', 'rgb(132 131 148)'),
        '--dsw-alias-brand-primary': pair(`rgb(${brand.join(' ')})`, `rgb(${brand.map(v => clamp(v+28,0,255)).join(' ')})`),
        '--dsw-alias-border-l1': pair('rgba(20 28 40 / .14)', 'rgba(255 255 255 / .16)'),
        '--dsw-alias-border-l2': pair(rgba(accent[0],accent[1],accent[2],.38), rgba(accent[0],accent[1],accent[2],.52)),
        '--dsw-alias-interactive-bg-hover': pair('rgba(0 0 0 / .06)', 'rgba(255 255 255 / .09)'),
        '--dsw-alias-interactive-bg-active': pair(rgba(accent[0],accent[1],accent[2],.14), rgba(accent[0],accent[1],accent[2],.22)),
      }
    }

    function markGlass(config) {
      clearGlass()
      const requestedBlur = clamp(config.blur, 0, 30)
      document.documentElement.style.setProperty('--we-skin-blur-soft', `${Math.min(requestedBlur * .35, 3).toFixed(1)}px`)
      document.documentElement.style.setProperty('--we-skin-blur-component', `${Math.min(requestedBlur * .6, 5).toFixed(1)}px`)
      const width = window.innerWidth; const height = window.innerHeight; const viewportArea = width * height
      let budget = 24
      for (const element of document.querySelectorAll('aside,header,nav,section,form,body div')) {
        if (budget <= 0 || element.id === BACKGROUND_ID || element.closest(`#${BACKGROUND_ID}`)) continue
        const rect = element.getBoundingClientRect()
        const area = rect.width * rect.height
        if (rect.width < 80 || rect.height < 44 || area > viewportArea * .48) continue
        const color = getComputedStyle(element).backgroundColor
        const parts = (color.match(/[\d.]+/g) || []).map(Number)
        const alpha = color.startsWith('rgba') ? (parts[3] ?? 0) : color.startsWith('rgb') ? 1 : 0
        if (alpha < .06 || alpha > .97) continue
        let layer = null
        if (rect.x <= 8 && rect.height >= height * .68 && rect.width >= width * .12 && rect.width <= width * .4) layer = 'sidebar'
        else if (rect.top <= 8 && rect.width >= width * .45 && rect.height <= height * .18) layer = 'header'
        else if (rect.bottom >= height * .72 && rect.width >= width * .25 && rect.width <= width * .82 && rect.height <= 220) layer = 'composer'
        else if (area >= viewportArea * .012 && area <= viewportArea * .16) layer = 'surface'
        if (!layer || element.closest('[data-we-glass],[data-we-layer]')) continue
        if (layer === 'sidebar') element.setAttribute('data-we-layer', layer)
        else element.setAttribute('data-we-glass', layer)
        budget -= 1
      }
    }
    function clearGlass() {
      for (const element of document.querySelectorAll('[data-we-glass]')) element.removeAttribute('data-we-glass')
      for (const element of document.querySelectorAll('[data-we-layer]')) element.removeAttribute('data-we-layer')
      document.documentElement.style.removeProperty('--we-skin-blur-soft')
      document.documentElement.style.removeProperty('--we-skin-blur-component')
    }

    function createController(theme) {
      let snapshot = { config: { ...DEFAULT_CONFIG }, wallpaper: null, health: null, error: null, connected: false }
      const listeners = new Set()
      let disposeTheme = () => {}; let currentLayer = null; let currentMedia = null; let renderedMediaKey = ''
      let source = null; let pollTimer = null; let saveTimer = null
      let paletteKey = ''; let paletteCache = null
      const emit = patch => { snapshot = { ...snapshot, ...patch }; for (const listener of listeners) listener() }

      async function render() {
        const state = snapshot.wallpaper
        const config = effectiveConfig(snapshot.config, state)
        const enabled = config.enabled && config.followWallpaperEngine && state && state.ok
        if (!enabled) {
          document.body && document.body.classList.remove('dsh-we-skin-active')
          if (currentLayer) currentLayer.remove(); currentLayer = null; currentMedia = null; renderedMediaKey = ''
          disposeTheme(); disposeTheme = () => {}; clearGlass(); return
        }
        ensureStyle(); document.body.classList.add('dsh-we-skin-active')
        const background = ensureBackground()
        if (background) {
          background.style.background = state.schemeColor || '#07090d'
          const mediaKey = `${state.id}|${state.revision}|${state.type}|${state.entry}|${state.art}|${config.fit}|${config.zoom}|${config.positionX}|${config.positionY}`
          if (currentLayer && currentMedia && renderedMediaKey === mediaKey) {
            currentLayer.style.transitionDuration = `${config.transitionMs}ms`
            currentMedia.muted = currentMedia.tagName === 'VIDEO' ? config.muted !== false : currentMedia.muted
            styleMedia(currentMedia, config, state.type === 'web')
          } else {
            const layer = document.createElement('div'); layer.className = 'we-layer'; layer.style.transitionDuration = `${config.transitionMs}ms`
            addStaticFill(layer, state, config)
            const media = createMedia(state, config); layer.appendChild(media); background.appendChild(layer)
            requestAnimationFrame(() => layer.classList.add('is-visible'))
            const previous = currentLayer; currentLayer = layer; currentMedia = media; renderedMediaKey = mediaKey
            if (previous) { previous.classList.remove('is-visible'); setTimeout(() => previous.remove(), config.transitionMs + 80) }
          }
        }
        const key = `${state.id}|${state.preview}|${state.schemeColor}`
        if (key !== paletteKey) { paletteKey = key; paletteCache = await samplePalette(state) }
        disposeTheme(); disposeTheme = theme.overrideTokens(SKIN, buildOverrides(state, paletteCache, config))
        requestAnimationFrame(() => markGlass(config))
      }

      function acceptConfig(payload) {
        const config = payload && payload.config ? payload.config : payload
        if (config && typeof config === 'object') {
          emit({ config: { ...DEFAULT_CONFIG, ...config }, error: null })
          render().catch(error => emit({ error: String(error.message || error) }))
        }
      }
      function acceptWallpaper(wallpaper) {
        if (!wallpaper || typeof wallpaper !== 'object') return
        const previous = snapshot.wallpaper
        const changed = !previous || previous.revision !== wallpaper.revision || previous.id !== wallpaper.id
        emit({ wallpaper, connected: true, error: wallpaper.ok ? null : wallpaper.error })
        if (changed) render().catch(error => emit({ error: String(error.message || error) }))
      }
      async function refresh() {
        try {
          const [state, configResult, health] = await Promise.all([
            fetchJson(`${API}/state`), fetchJson(`${API}/config`), fetchJson(`${API}/health`).catch(() => null),
          ])
          acceptConfig(configResult); acceptWallpaper(state); emit({ health, connected: true })
        } catch (error) { emit({ connected: false, error: String(error.message || error) }) }
      }
      async function saveConfig(nextConfig) {
        const optimistic = { ...snapshot.config, ...nextConfig }; emit({ config: optimistic }); await render()
        try {
          const result = await fetchJson(`${API}/config`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(optimistic) })
          acceptConfig(result)
        } catch (error) { emit({ error: String(error.message || error) }); throw error }
      }
      function saveCurrentView(patch) {
        const id = snapshot.wallpaper && snapshot.wallpaper.id
        if (!id) return saveConfig(patch)
        const current = effectiveConfig(snapshot.config, snapshot.wallpaper)
        const perWallpaper = { ...(snapshot.config.perWallpaper || {}), [id]: {
          fit:current.fit, zoom:current.zoom, positionX:current.positionX, positionY:current.positionY,
          surfaceTransparency:current.surfaceTransparency, blur:current.blur, themeStrength:current.themeStrength, ...patch,
        }}
        emit({ config:{...snapshot.config,perWallpaper} }); render().catch(error=>emit({error:String(error.message||error)}))
        clearTimeout(saveTimer); saveTimer = setTimeout(() => saveConfig({ perWallpaper }).catch(() => {}), 180)
      }
      function resetCurrentView() {
        const id = snapshot.wallpaper && snapshot.wallpaper.id; if (!id) return
        const perWallpaper = { ...(snapshot.config.perWallpaper || {}) }; delete perWallpaper[id]
        return saveConfig({ perWallpaper })
      }
      function start() {
        ensureStyle(); refresh(); pollTimer = setInterval(refresh, isOfficialDesktop() ? 1000 : 2500)
        // Avoid streaming SSE through the Desktop custom-protocol forwarder.
        // Desktop polls the same state instead; Web keeps push.
        if (isOfficialDesktop()) return
        try {
          source = new EventSource(`${API}/events`)
          source.addEventListener('ready', event => { try { const data=JSON.parse(event.data); acceptConfig(data.config); acceptWallpaper(data.state) } catch(error){emit({error:String(error.message||error)})} })
          source.addEventListener('wallpaper', event => { try { acceptWallpaper(JSON.parse(event.data)) } catch(error){emit({error:String(error.message||error)})} })
          source.addEventListener('config', event => { try { acceptConfig(JSON.parse(event.data)) } catch(error){emit({error:String(error.message||error)})} })
          source.onerror = () => emit({ connected:false }); source.onopen = () => emit({ connected:true })
        } catch (error) { console.warn('[dsh-skin-we] event stream unavailable; polling fallback active', error) }
      }
      function dispose() {
        clearInterval(pollTimer); clearTimeout(saveTimer); if (source) source.close(); source=null; disposeTheme(); clearGlass()
        if (currentLayer) currentLayer.remove(); currentLayer=null; currentMedia=null; renderedMediaKey=''
        document.getElementById(BACKGROUND_ID)?.remove(); document.getElementById(STYLE_ID)?.remove()
        document.body && document.body.classList.remove('dsh-we-skin-active')
      }
      return { getSnapshot:()=>snapshot, subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)}, start,dispose,refresh,saveConfig,saveCurrentView,resetCurrentView }
    }

    function RangeRow({ label, value, min, max, step, suffix, onChange }) {
      return h('div',{className:'we-row'},h('label',null,label),h('input',{type:'range',min,max,step,value,onChange:event=>onChange(Number(event.target.value))}),h('span',{className:'we-value'},`${value}${suffix||''}`))
    }
    function WallpaperSettings({ controller }) {
      const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
      const wallpaper=snap.wallpaper; const config=effectiveConfig(snap.config,wallpaper); const global=snap.config
      const saveGlobal=patch=>controller.saveConfig(patch).catch(()=>{}); const saveView=patch=>controller.saveCurrentView(patch)
      return h('div',{className:'we-settings'},
        h('h2',null,'DSH 壁纸桥 · Wallpaper Bridge'),h('p',{className:'we-sub'},'跟随 Wallpaper Engine，按壁纸保存显示参数。场景壁纸仅显示提取的静态图或预览图；网页壁纸在隔离框架中运行。'),
        h('div',{className:'we-card'},h('h3',null,'实时同步'),
          h('div',{className:'we-row'},h('label',null,'插件效果'),h('label',{className:'we-switch'},h('input',{type:'checkbox',checked:global.enabled!==false,onChange:event=>saveGlobal({enabled:event.target.checked})}),'启用壁纸和自适应主题')),
          h('div',{className:'we-row'},h('label',null,'Wallpaper Engine'),h('label',{className:'we-switch'},h('input',{type:'checkbox',checked:global.followWallpaperEngine!==false,onChange:event=>saveGlobal({followWallpaperEngine:event.target.checked})}),'自动跟随当前壁纸')),
          h('div',{className:'we-row'},h('label',null,'当前壁纸'),h('span',{className:'we-switch'},wallpaper&&wallpaper.ok?`${wallpaper.title||wallpaper.id} · ${wallpaper.type} · ${wallpaper.monitor||''}`:'未检测到'),h('span',{className:'we-value'},snap.connected?'已连接':'轮询中'))),
        h('div',{className:'we-card'},h('h3',null,'显示比例（当前壁纸）'),
          wallpaper&&wallpaper.type==='scene'&&!wallpaper.art&&!global.perWallpaper?.[wallpaper.id]
            ? h('p',{className:'we-sub'},'该场景没有可用原画，现已自动完整显示预览图，并用柔和背景补齐画面。可在下方为这一张壁纸微调。')
            : null,
          h('div',{className:'we-row'},h('label',null,'适配模式'),h('select',{value:config.fit,onChange:event=>saveView({fit:event.target.value})},h('option',{value:'cover'},'智能铺满'),h('option',{value:'contain'},'完整显示'),h('option',{value:'native'},'原始尺寸'),h('option',{value:'fill'},'拉伸填充')),h('span',{className:'we-value'},config.fit)),
          h(RangeRow,{label:'缩放',value:config.zoom,min:.25,max:4,step:.05,suffix:'×',onChange:value=>saveView({zoom:value})}),
          h(RangeRow,{label:'横向焦点',value:config.positionX,min:0,max:100,step:1,suffix:'%',onChange:value=>saveView({positionX:value})}),
          h(RangeRow,{label:'纵向焦点',value:config.positionY,min:0,max:100,step:1,suffix:'%',onChange:value=>saveView({positionY:value})}),
          h('div',{className:'we-actions'},h('button',{type:'button',onClick:()=>controller.resetCurrentView()},'恢复当前壁纸默认值'))),
        h('div',{className:'we-card'},h('h3',null,'界面主题（当前壁纸）'),
          h(RangeRow,{label:'界面透明度',value:config.surfaceTransparency,min:0,max:70,step:1,suffix:'%',onChange:value=>saveView({surfaceTransparency:value})}),
          h(RangeRow,{label:'毛玻璃',value:config.blur,min:0,max:30,step:1,suffix:'px',onChange:value=>saveView({blur:value})}),
          h(RangeRow,{label:'自动配色强度',value:config.themeStrength,min:0,max:100,step:1,suffix:'%',onChange:value=>saveView({themeStrength:value})}),
          h(RangeRow,{label:'切换过渡',value:global.transitionMs,min:0,max:1500,step:50,suffix:'ms',onChange:value=>saveGlobal({transitionMs:value})}),
          h('div',{className:'we-row'},h('label',null,'视频声音'),h('label',{className:'we-switch'},h('input',{type:'checkbox',checked:global.muted===false,onChange:event=>saveGlobal({muted:!event.target.checked})}),'允许播放声音'))),
        h('div',{className:'we-card'},h('h3',null,'诊断'),h('div',{className:'we-health'},snap.health?`Host ${snap.health.version||''} · ${snap.health.pollMs||'?'}ms · 事件连接 ${snap.health.eventClients||0}`:'正在读取 Host 状态…'),snap.error?h('div',{className:'we-health we-error'},snap.error):null,h('div',{className:'we-actions'},h('button',{type:'button',onClick:()=>controller.refresh()},'重新检测'))))
    }

    const inject = ['theme','slots']
    function apply(ctx) {
      const theme=ctx.get('theme'); if(!theme) throw new Error('dsh-skin-we: theme service unavailable')
      const controller=createController(theme); controller.start()
      ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'wallpaper-skin',order:17,label:'DSH 壁纸桥'},props=>h(WallpaperSettings,{...props,controller})))
      ctx.on('dispose',()=>controller.dispose())
    }
    exports.name=SKIN; exports.inject=inject; exports.apply=apply
    return module.exports
  },
})
