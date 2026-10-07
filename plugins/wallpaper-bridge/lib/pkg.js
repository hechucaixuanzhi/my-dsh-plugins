// Wallpaper Engine scene.pkg parser (PKGV format) — pure Node.
// Layout: uint32 magicLen | magic "PKGVxxxx" | uint32 entryCount |
//   per entry: uint32 pathLen | path (utf8) | uint32 offset | uint32 size |
//   data blob.
import { promises as fsp } from 'node:fs'

export async function readPkg(file) {
  const buf = await fsp.readFile(file)
  let pos = 0
  const readU32 = () => {
    const v = buf.readUInt32LE(pos)
    pos += 4
    return v
  }
  const magicLen = readU32()
  const magic = buf.toString('latin1', pos, pos + magicLen)
  pos += magicLen
  if (!magic.startsWith('PKGV')) throw new Error(`not a scene.pkg (magic ${magic})`)
  const count = readU32()
  const entries = []
  for (let i = 0; i < count; i++) {
    const pathLen = readU32()
    const path = buf.toString('utf8', pos, pos + pathLen)
    pos += pathLen
    const offset = readU32()
    const size = readU32()
    entries.push({ path, offset, size })
  }
  // offsets are relative to the data section that follows the entry table
  const dataStart = pos
  for (const e of entries) e.offset += dataStart
  return { version: magic, entries, buf }
}

/** All entries with their extension and size, sorted by size desc. */
export function listEntries(pkg) {
  return pkg.entries
    .map((e) => ({ ...e, ext: (e.path.match(/\.([A-Za-z0-9]+)$/)?.[1] || '').toLowerCase() }))
    .sort((a, b) => b.size - a.size)
}

/** Extract one entry to a file on disk. */
export async function extractEntry(pkg, entry, dest) {
  const data = pkg.buf.subarray(entry.offset, entry.offset + entry.size)
  await fsp.writeFile(dest, data)
  return dest
}

/** Best "original artwork" candidate: biggest raster image in the package. */
export function bestImageEntry(pkg) {
  const imgs = pkg.entries.filter((e) => /\.(jpg|jpeg|png|webp)$/i.test(e.path))
  imgs.sort((a, b) => b.size - a.size)
  return imgs[0] ?? null
}
