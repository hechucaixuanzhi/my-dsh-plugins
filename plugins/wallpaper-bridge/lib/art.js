// Extract the embedded PNG artwork from a Wallpaper Engine scene.pkg:
// the base texture .tex (TEXV container) carries a PNG payload; find the
// PNG signature and read through its IEND chunk.
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { readPkg } from './pkg.js'

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff])

/** Locate [start, end) of an embedded PNG inside a buffer, or null. */
export function findPng(buf) {
  for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] !== 0x89) continue
    let ok = true
    for (let k = 1; k < 8; k++) {
      if (buf[i + k] !== PNG_SIG[k]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    // walk chunks: 4B length, 4B type, data, 4B crc
    let pos = i + 8
    while (pos + 12 <= buf.length) {
      const len = buf.readUInt32BE(pos)
      const type = buf.toString('latin1', pos + 4, pos + 8)
      if (type === 'IEND') return [i, pos + 12]
      if (len > 0x7fffffff) break
      pos += 12 + len
    }
  }
  return null
}

/** Locate [start, end) of an embedded JPEG. Wallpaper Engine TEXV textures
 * often carry the original scene artwork as a JPEG rather than a PNG. */
export function findJpeg(buf) {
  for (let i = 0; i < buf.length - JPEG_SIG.length; i++) {
    if (buf[i] !== JPEG_SIG[0] || buf[i + 1] !== JPEG_SIG[1] || buf[i + 2] !== JPEG_SIG[2]) continue
    for (let end = i + JPEG_SIG.length; end < buf.length - 1; end++) {
      if (buf[end] === 0xff && buf[end + 1] === 0xd9) return [i, end + 2]
    }
  }
  return null
}

/** Art cache dir for this wallpaper id. */
export function artCacheDir(id) {
  return path.join(process.env.APPDATA || os.homedir(), 'dsh-skin-we', 'art', String(id))
}

/**
 * Extract the embedded PNG artwork of a scene package into the art cache.
 * @returns absolute path of the cached png, or null when nothing embedded.
 */
export async function extractSceneArt(pkgFile, workshopId) {
  const dir = artCacheDir(workshopId)
  for (const cachedName of ['art.jpg', 'art.png']) {
    const cachedPath = path.join(dir, cachedName)
    try {
      const cached = await fsp.stat(cachedPath)
      if (cached.isFile() && cached.size > PNG_SIG.length) return cachedPath
    } catch {
      // Try the next known art format.
    }
  }

  const pkg = await readPkg(pkgFile)
  let best = null
  for (const e of pkg.entries) {
    const entry = pkg.buf.subarray(e.offset, e.offset + e.size)
    for (const candidate of [
      { range: findPng(entry), ext: 'png' },
      { range: findJpeg(entry), ext: 'jpg' },
    ]) {
      if (!candidate.range) continue
      const [start, end] = candidate.range
      const size = end - start
      if (!best || size > best.size) {
        best = { size, start: e.offset + start, end: e.offset + end, ext: candidate.ext }
      }
    }
  }
  if (!best) return null
  await fsp.mkdir(dir, { recursive: true })
  const dest = path.join(dir, `art.${best.ext}`)
  await fsp.writeFile(dest, pkg.buf.subarray(best.start, best.end))
  return dest
}
