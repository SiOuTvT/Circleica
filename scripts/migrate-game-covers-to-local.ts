/**
 * 一次性搬运脚本：主站 Game 封面图本地化
 *
 * 把 Game.coverImage 仍然挂在外部图床（http/https 开头）的封面下载下来，
 * 交给项目统一的存储层（src/lib/storage.ts）落盘，再把库里的地址改成本地 URL。
 *
 * 范围：只动主站 Game 表的 coverImage。副站（Work）的作品图/缩略图/画廊截图一律不碰。
 *
 * 用法：
 *   npx tsx scripts/migrate-game-covers-to-local.ts
 *
 * 设计要点：
 *
 * 1. 存储后端不写死。
 *    落盘一律走 getStorage() —— 工厂按后台服务配置二选一（有 R2 配置 → R2StorageAdapter，
 *    否则 → LocalStorageAdapter）。因此管理员哪天在后台把 R2 五项填全，本脚本无需改一行代码
 *    就会自动把封面传到 R2，回填的 url 也自然是 R2 公网地址。
 *    前提：取 storage 之前必须先 await waitForServiceConfig()，否则 DB 配置还没加载完，
 *    会误判成「没配 R2」而走本地分支。
 *
 * 2. 下载必须容忍慢。
 *    VNDB 图床响应时间实测 0.6s ~ 15.9s 乱跳，用默认超时必挂。这里给 25s 超时 + 最多 3 次重试
 *    （间隔 2s）。
 *
 * 3. 绝不允许「库里已改成本地、文件其实没落盘」。
 *    只有「下载成功」且「storage.upload 成功」且「DB update 成功」三步都过了才改库。
 *    任何一步失败，coverImage 原样保留外部地址 —— 宁可继续挂外链，也不能留 404。
 *    （唯一副作用：upload 成功但 DB 更新失败时，会留下一个孤儿文件，此时库里仍是外链，安全。）
 *
 * 4. 幂等：coverImage 已以 /uploads/ 开头的记录直接跳过，重复跑不会重复下载/重复上传。
 */
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { getStorage } from "@/lib/storage"
import { waitForServiceConfig } from "@/lib/service-config"

/** 单次下载超时（VNDB 慢起来能到 15.9s，默认超时必挂） */
const DOWNLOAD_TIMEOUT_MS = 25_000
/** 单次下载最多尝试次数 */
const DOWNLOAD_RETRIES = 3
/** 重试间隔 */
const RETRY_DELAY_MS = 2_000
/** 存储子目录 */
const FOLDER = "covers"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 统一 jpeg → jpg */
function normalizeExt(ext: string): string {
  const e = ext.toLowerCase()
  return e === "jpeg" ? "jpg" : e
}

/**
 * 从 URL 后缀或响应 Content-Type 判断扩展名（只认 jpg / png / webp）。
 * 认不出来返回 null，调用方会把这条记为失败而不是硬猜 .jpg。
 */
function resolveExt(url: string, contentType: string | null): string | null {
  let pathname = url
  try {
    pathname = new URL(url).pathname
  } catch {
    /* 非法 URL，退回原串做后缀匹配 */
  }
  const fromUrl = pathname.match(/\.(jpe?g|png|webp)$/i)
  if (fromUrl) return normalizeExt(fromUrl[1])

  if (contentType) {
    const ct = contentType.split(";")[0].trim().toLowerCase()
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/pjpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }
    if (map[ct]) return map[ct]
  }
  return null
}

/** 单次下载尝试（不重试） */
async function fetchOnce(url: string): Promise<{ buffer: Buffer; ext: string }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    redirect: "follow",
    headers: {
      // VNDB 对空 UA / 爬虫 UA 会直接拒，给一个可识别的 UA
      "User-Agent": "Circleica/1.0 (cover migration)",
      Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  if (!buffer.length) throw new Error("响应体为空")

  const ext = resolveExt(url, res.headers.get("content-type"))
  if (!ext) {
    throw new Error(`无法识别图片类型（Content-Type: ${res.headers.get("content-type") ?? "无"}，URL 无可用后缀）`)
  }
  return { buffer, ext }
}

/** 下载（带 25s 超时 + 最多 3 次重试，间隔 2s） */
async function download(url: string): Promise<{ buffer: Buffer; ext: string }> {
  let lastError = "未知原因"
  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt++) {
    try {
      return await fetchOnce(url)
    } catch (e) {
      lastError =
        e instanceof Error
          ? e.name === "TimeoutError" || e.name === "AbortError"
            ? `超时（>${DOWNLOAD_TIMEOUT_MS / 1000}s）`
            : e.message
          : String(e)
      console.warn(`    ↻ 第 ${attempt}/${DOWNLOAD_RETRIES} 次失败：${lastError}`)
      if (attempt < DOWNLOAD_RETRIES) await sleep(RETRY_DELAY_MS)
    }
  }
  throw new Error(lastError)
}

async function main() {
  // 先探活：@/lib/prisma 在数据库不可达时会对读查询返回空结果而不是报错，
  // 不显式探活的话「连不上库」会被静默误判成「没有待处理封面」。
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (e) {
    throw new Error(`数据库不可达，终止（避免把空结果误判成"没有待处理"）：${e instanceof Error ? e.message : String(e)}`)
  }

  // 关键：先等后台服务配置加载完，再取 storage —— 决定走 Local 还是 R2 的就是这份配置。
  await waitForServiceConfig()
  const storage = getStorage()

  const games = await prisma.game.findMany({
    select: { id: true, serialId: true, title: true, coverImage: true },
    orderBy: { serialId: "asc" },
  })

  console.log("════════════════════════════════════════")
  console.log(" 主站 Game 封面图本地化")
  console.log("════════════════════════════════════════")
  console.log(`存储后端        : ${storage.name}`)
  console.log(`下载超时/重试   : ${DOWNLOAD_TIMEOUT_MS / 1000}s / 最多 ${DOWNLOAD_RETRIES} 次（间隔 ${RETRY_DELAY_MS / 1000}s）`)
  console.log(`Game 总数       : ${games.length}`)

  // ── 分类 ──
  const alreadyLocal = games.filter((g) => g.coverImage.startsWith("/uploads/"))
  const pending = games.filter((g) => /^https?:\/\//i.test(g.coverImage))
  const other = games.filter(
    (g) => !g.coverImage.startsWith("/uploads/") && !/^https?:\/\//i.test(g.coverImage),
  )

  console.log(`已是本地(/uploads/)，跳过 : ${alreadyLocal.length}`)
  console.log(`待搬运(外链 http/https)   : ${pending.length}`)
  if (other.length) {
    console.log(`既非 /uploads/ 也非外链，不动 : ${other.length}（空值或相对路径，需人工确认）`)
    for (const g of other) console.log(`    - serialId ${g.serialId} 「${g.title}」coverImage = ${JSON.stringify(g.coverImage)}`)
  }
  console.log("────────────────────────────────────────")

  let ok = 0
  const failures: Array<{ serialId: number; title: string; url: string; reason: string }> = []

  for (const g of pending) {
    const label = `serialId ${g.serialId} 「${g.title}」`
    console.log(`[${ok + failures.length + 1}/${pending.length}] ${label}`)
    console.log(`    来源: ${g.coverImage}`)

    let buffer: Buffer
    let ext: string
    try {
      const got = await download(g.coverImage)
      buffer = got.buffer
      ext = got.ext
      console.log(`    下载: ${(buffer.length / 1024).toFixed(1)} KB, ext=${ext}`)
    } catch (e) {
      const reason = `下载失败 - ${e instanceof Error ? e.message : String(e)}`
      console.error(`    ✗ ${reason}（coverImage 保持原值不动）`)
      failures.push({ serialId: g.serialId, title: g.title, url: g.coverImage, reason })
      continue
    }

    // 落盘：文件路径 / key / URL 全部由 storage 层决定，脚本不自己拼
    let url: string
    let key: string
    try {
      const uploaded = await storage.upload(buffer, FOLDER, ext)
      url = uploaded.url
      key = uploaded.key
      console.log(`    落盘: key=${key}`)
    } catch (e) {
      const reason = `写入失败 - ${e instanceof Error ? e.message : String(e)}`
      console.error(`    ✗ ${reason}（coverImage 保持原值不动）`)
      failures.push({ serialId: g.serialId, title: g.title, url: g.coverImage, reason })
      continue
    }

    // 最后一步才改库
    try {
      await prisma.game.update({ where: { id: g.id }, data: { coverImage: url } })
    } catch (e) {
      const reason = `DB 更新失败 - ${e instanceof Error ? e.message : String(e)}（文件已写入 ${key}，但 coverImage 仍是外链）`
      console.error(`    ✗ ${reason}`)
      failures.push({ serialId: g.serialId, title: g.title, url: g.coverImage, reason })
      continue
    }

    ok++
    console.log(`    ✓ ${url}`)
  }

  console.log("════════════════════════════════════════")
  console.log(`成功 ${ok} 张 / 失败 ${failures.length} 张 / 跳过 ${alreadyLocal.length} 张`)
  if (failures.length) {
    console.log("────────────────────────────────────────")
    console.log("失败明细（这些记录的 coverImage 原样未动，仍指向外链）：")
    for (const f of failures) {
      console.log(`  - serialId ${f.serialId} 「${f.title}」`)
      console.log(`      原因: ${f.reason}`)
      console.log(`      外链: ${f.url}`)
    }
  }
  console.log("════════════════════════════════════════")
  if (failures.length) process.exitCode = 1
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[migrate-covers] 致命错误：", e)
    await prisma.$disconnect()
    process.exit(1)
  })
