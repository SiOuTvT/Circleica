/**
 * NSFW 封面自动分级兜底（NSFWJS 本地模型，零成本）。
 *
 * 定位：VNDB 未提供 image.sexual 评级的作品，用本地 NSFWJS（MobileNetV2）识别封面露骨度。
 * 候选：有封面 + coverSexual < 0（未定级）+ 有 VNDB 源。
 * 策略：高置信（>=NSFW_CONFIDENCE，默认 0.9）直接写库；低置信跳过（保持 -1，进后台人工审核页）。
 * 映射：Porn/Hentai→2(露骨)  Sexy→1(暗示)  Neutral/Drawing→0(安全)。
 *
 * 运行：NODE_PATH="D:/circleica-tmp/nsfw-runtime/node_modules" \
 *       BACKFILL_GRADE_AUTO=1 BACKFILL_LIMIT=0 \
 *       tsx scripts/nsfw-classify.ts
 * 断点：%TEMP%/circleica-nsfw-classify-state.json（可续跑，幂等）
 */
import https from "node:https"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"

// 独立运行时包（NODE_PATH 提供）
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tf = require("@tensorflow/tfjs")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nsfwjs = require("nsfwjs")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jpeg = require("jpeg-js")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PNG } = require("pngjs")

const STATE_FILE = path.join(os.tmpdir(), "circleica-nsfw-classify-state.json")
const LIMIT = parseInt(process.env.BACKFILL_LIMIT || "0", 10) || 0
const DELAY_MS = parseInt(process.env.BACKFILL_DELAY_MS || "200", 10) || 0
const CONFIDENCE = parseFloat(process.env.NSFW_CONFIDENCE || "0.9")

interface State { offset: number }
function loadState(): State {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
    return { offset: typeof s.offset === "number" ? s.offset : 0 }
  } catch { return { offset: 0 } }
}
function saveState(s: State) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }), "utf8")
  } catch (e) {
    console.error("[nsfw-classify] 断点写入失败（不影响本次）:", e instanceof Error ? e.message : String(e))
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : https
    client.get(url, { family: 4 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        res.destroy()
        return
      }
      const chunks: Buffer[] = []
      res.on("data", (c) => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks)))
    }).on("error", reject)
  })
}

/** 解码图片 → [h,w,3] 0-255 的 RGB 像素 */
function decodeRgb(buf: Buffer): { data: Uint8Array; width: number; height: number } {
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    // JPEG
    const d = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 })
    const { width, height, data } = d
    const rgb = new Uint8Array(width * height * 3)
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      rgb[j] = data[i]
      rgb[j + 1] = data[i + 1]
      rgb[j + 2] = data[i + 2]
    }
    return { data: rgb, width, height }
  }
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    // PNG
    const png = PNG.sync.read(buf)
    const { width, height } = png
    const rgb = new Uint8Array(width * height * 3)
    for (let i = 0, j = 0; i < png.data.length; i += 4, j += 3) {
      rgb[j] = png.data[i]
      rgb[j + 1] = png.data[i + 1]
      rgb[j + 2] = png.data[i + 2]
    }
    return { data: rgb, width, height }
  }
  throw new Error("不支持的图片格式")
}

function mapLevel(className: string): number {
  if (className === "Porn" || className === "Hentai") return 2
  if (className === "Sexy") return 1
  return 0
}

async function main() {
  console.log(`[nsfw-classify] NSFWJS 自动分级启动（置信阈值 ${CONFIDENCE}）`)
  const model = await nsfwjs.load(undefined, { size: 224 })
  console.log("[nsfw-classify] MobileNetV2 模型加载成功")

  // 候选：有封面 + 未定级 + VNDB 源
  const rows = await prisma.$queryRaw<Array<{ id: string; coverImage: string }>>`
    SELECT w.id, w."coverImage" FROM "Work" w
    WHERE w."coverImage" <> ''
      AND w."coverSexual" < 0
      AND EXISTS (SELECT 1 FROM "WorkSource" ws WHERE ws."workId" = w.id AND ws.source = 'VNDB')
    ORDER BY w."viewCount" DESC, w.id ASC
  `
  console.log(`[nsfw-classify] 未定级候选 ${rows.length}`)

  const state = loadState()
  const target = LIMIT > 0 ? rows.slice(state.offset, state.offset + LIMIT) : rows.slice(state.offset)
  if (target.length === 0) {
    console.log(`[nsfw-classify] 无可处理候选（offset=${state.offset}），全部已分级或无需处理。`)
    return
  }
  console.log(`[nsfw-classify] 从 offset=${state.offset} 续跑，本次处理 ${target.length}`)

  let ok = 0
  let lowConf = 0
  let fail = 0
  const startOffset = state.offset
  for (let i = 0; i < target.length; i++) {
    const row = target[i]
    try {
      const buf = await download(row.coverImage)
      const { data, width, height } = decodeRgb(buf)
      const tensor = tf.tensor3d(data, [height, width, 3])
      const preds = await model.classify(tensor)
      tensor.dispose()
      const top = preds[0]
      if (top.probability >= CONFIDENCE) {
        const level = mapLevel(top.className)
        await prisma.work.update({ where: { id: row.id }, data: { coverSexual: level } })
        ok++
      } else {
        lowConf++ // 低置信保持 -1，进后台人工审核
      }
    } catch (e) {
      fail++
      console.error(`[nsfw-classify] ${row.id} 失败：${e instanceof Error ? e.message : String(e)}`)
    }

    if ((i + 1) % 10 === 0) {
      saveState({ offset: startOffset + i + 1 })
      console.log(`[nsfw-classify] 进度 ${i + 1}/${target.length}（写库 ${ok} / 低置信 ${lowConf} / 失败 ${fail}）`)
    }
    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }

  // 收尾：断点推进到末尾
  saveState({ offset: startOffset + target.length })

  // 分级影响前台展示 → 清副站缓存
  await cache.delByPrefix("circleica:galvelica:").catch(() => {})

  console.log(`[nsfw-classify] 完成 ✅ 写库 ${ok} / 低置信(待人工) ${lowConf} / 失败 ${fail}；断点 offset=${startOffset + target.length}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[nsfw-classify] 致命错误:", e.message)
    process.exit(1)
  })
