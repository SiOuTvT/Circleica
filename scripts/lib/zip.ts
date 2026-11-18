/**
 * 极简 ZIP 读写（仅覆盖 xlsx 需要的子集）。
 *
 * 存在的理由：SheetJS 社区版不写单元格样式，需要在生成后直接改 xlsx 内部的
 * XML 文件；而 xlsx 本质是 zip，本项目没有引入任何 zip 库，因此这里手写一份
 * 最小实现——只读常规（非 Zip64、非加密）zip，写出 deflate 压缩的 zip。
 */

import { inflateRawSync, deflateRawSync } from "node:zlib"

export interface ZipEntry {
  name: string
  data: Buffer
  /** 原条目在中央目录里记录的时间/日期字段，原样保留 */
  time: number
  date: number
}

// ── CRC32 ───────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

// ── 读 ──────────────────────────────────────────────────────────
export function unzip(input: Buffer): ZipEntry[] {
  // 定位 EOCD（末尾可能有注释，从后往前找签名）
  let eocd = -1
  for (let i = input.length - 22; i >= 0 && i >= input.length - 22 - 65535; i--) {
    if (input.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("不是有效的 zip 文件：找不到 EOCD")

  const count = input.readUInt16LE(eocd + 10)
  let p = input.readUInt32LE(eocd + 16)

  const out: ZipEntry[] = []
  for (let n = 0; n < count; n++) {
    if (input.readUInt32LE(p) !== 0x02014b50) throw new Error("中央目录损坏")
    const method = input.readUInt16LE(p + 10)
    const time = input.readUInt16LE(p + 12)
    const date = input.readUInt16LE(p + 14)
    const compSize = input.readUInt32LE(p + 20)
    const nameLen = input.readUInt16LE(p + 28)
    const extraLen = input.readUInt16LE(p + 30)
    const commentLen = input.readUInt16LE(p + 32)
    const localOffset = input.readUInt32LE(p + 42)
    const name = input.toString("utf8", p + 46, p + 46 + nameLen)

    // 本地头：签名(4) + 26 字节固定字段，随后是文件名与扩展字段
    const lNameLen = input.readUInt16LE(localOffset + 26)
    const lExtraLen = input.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + lNameLen + lExtraLen
    const raw = input.subarray(dataStart, dataStart + compSize)

    let data: Buffer
    if (method === 0) data = Buffer.from(raw)
    else if (method === 8) data = inflateRawSync(raw)
    else throw new Error(`不支持的压缩方式 ${method}（${name}）`)

    out.push({ name, data, time, date })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

// ── 写 ──────────────────────────────────────────────────────────
export function zip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8")
    const deflated = deflateRawSync(e.data, { level: 6 })
    const crc = crc32(e.data)

    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4) // version needed
    lh.writeUInt16LE(0, 6) // flags
    lh.writeUInt16LE(8, 8) // deflate
    lh.writeUInt16LE(e.time, 10)
    lh.writeUInt16LE(e.date, 12)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(deflated.length, 18)
    lh.writeUInt32LE(e.data.length, 22)
    lh.writeUInt16LE(nameBuf.length, 26)
    lh.writeUInt16LE(0, 28)
    locals.push(lh, nameBuf, deflated)

    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(20, 4) // version made by
    ch.writeUInt16LE(20, 6) // version needed
    ch.writeUInt16LE(0, 8) // flags
    ch.writeUInt16LE(8, 10) // deflate
    ch.writeUInt16LE(e.time, 12)
    ch.writeUInt16LE(e.date, 14)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(deflated.length, 20)
    ch.writeUInt32LE(e.data.length, 24)
    ch.writeUInt16LE(nameBuf.length, 28)
    ch.writeUInt16LE(0, 30) // extra
    ch.writeUInt16LE(0, 32) // comment
    ch.writeUInt16LE(0, 34) // disk start
    ch.writeUInt16LE(0, 36) // internal attrs
    ch.writeUInt32LE(0, 38) // external attrs
    ch.writeUInt32LE(offset, 42)
    centrals.push(ch, nameBuf)

    offset += lh.length + nameBuf.length + deflated.length
  }

  const localBuf = Buffer.concat(locals)
  const centralBuf = Buffer.concat(centrals)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(localBuf.length, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([localBuf, centralBuf, eocd])
}
