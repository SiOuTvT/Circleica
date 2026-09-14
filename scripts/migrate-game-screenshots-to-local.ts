/**
 * 一次性搬运脚本：主站 Game 截图外链本地化
 *
 * 把 Game.screenshots（Json 字符串数组）里仍然挂在外部图床（http/https 开头）的截图
 * 下载下来，交给项目统一的存储层（src/lib/storage.ts）落盘，再把数组里**同下标**的
 * 地址原地改成本地 URL。
 *
 * 范围：只动主站 Game 表的 screenshots。
 * 副站 Work 表的 screenshots / screenshotsSexual 一律不碰，也不写任何其它字段。
 *
 * 用法：
 *   npx tsx scripts/migrate-game-screenshots-to-local.ts --dry-run   # 先跑一遍：只打印将要替换的 URL，不下载/不落盘/不写库
 *   npx tsx scripts/migrate-game-screenshots-to-local.ts             # 确认条数无误后正式执行
 *
 * 设计要点（与 scripts/migrate-game-covers-to-local.ts 同一套做法）：
 *
 * 1. 存储后端不写死。
 *    落盘一律走 getStorage() —— 工厂按后台服务配置二选一（有 R2 配置 → R2StorageAdapter，
 *    否则 → LocalStorageAdapter）。管理员哪天在后台把 R2 五项填全，本脚本无需改一行代码
 *    就会自动把截图传到 R2，回填的 url 也自然是 R2 公网地址。
 *    前提：取 storage 之前必须先 await waitForServiceConfig()，否则 DB 配置还没加载完，
 *    会误判成「没配 R2」而走本地分支。
 *
 * 2. 下载必须容忍慢。
 *    t.vndb.org 实测单张 35~61s，默认超时必挂。这里给 25s 超时 + 最多 3 次重试（间隔 2s）。
 *
 * 3. 🔴 顺序纪律：只做「同下标的原地字符串替换」。
 *    截图数组的顺序有意义（与同下标的其它信息一一对应），因此本脚本
 *    **不排序、不去重、不删除失败项、不改变数组长度**：第 i 项成功就把第 i 项换成新 URL，
 *    失败就保留第 i 项原外链、打一行 warn，继续处理后面的下标 —— 绝不中断整批。
 *    整个过程在内存里改一份副本，最后用一次 update 把整个数组写回。
 *
 * 4. 绝不允许「库里已改成本地、文件其实没落盘」。
 *    只有「下载成功」且「storage.upload 成功」且「DB update 成功」三步都过了才改库。
 *    任何一步失败，该项原样保留外部地址 —— 宁可继续挂外链，也不能留 404。
 *    （唯一副作用：upload 成功但 DB 更新失败时，会留下一个孤儿文件，此时库里仍是外链，安全。）
 *
 * 5. 幂等：已是本地路径（/uploads/ 开头）的项直接跳过，重复跑不会重复下载/重复上传。
 */
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { getStorage } from "@/lib/storage"
import { waitForServiceConfig } from "@/lib/service-config"

/** 单次下载超时（VNDB 图床慢起来单张 35~61s，默认超时必挂） */
const DOWNLOAD_TIMEOUT_MS = 25_000
/** 单次下载最多尝试次数 */
const DOWNLOAD_RETRIES = 3
/** 重试间隔 */
const RETRY_DELAY_MS = 2_000
/** 存储子目录 */
const FOLDER = "screenshots"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 统一 jpeg → jpg */
function normalizeExt(ext: string): string {
  const e = ext.toLowerCase()
  return e === "jpeg" ? "jpg" : e
}

/**
 * 从 URL 后缀或响应 Content-Type 判断扩展名（只认 jpg / png / webp）。
 * 认不出来返回 null，调用方会把这张记为失败而不是硬猜 .jpg。
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
      "User-Agent": "Circleica/1.0 (screenshot migration)",
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

/** 只有「字符串数组」才可安全按下标替换；其它形状（非数组 / 混类型）交给人工确认 */
function toStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  return v.every((x) => typeof x === "string") ? (v as string[]) : null
}

const isRemote = (s: string) => /^https?:\/\//i.test(s)

async function main() {
  const dryRun = process.argv.includes("--dry-run")

  // 先探活：@/lib/prisma 在数据库不可达时会对读查询返回空结果而不是报错，
  // 不显式探活的话「连不上库」会被静默误判成「没有待处理截图」。
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (e) {
    throw new Error(`数据库不可达，终止（避免把空结果误判成"没有待处理"）：${e instanceof Error ? e.message : String(e)}`)
  }

  // 关键：先等后台服务配置加载完，再取 storage —— 决定走 Local 还是 R2 的就是这份配置。
  await waitForServiceConfig()
  const storage = getStorage()

  const games = await prisma.game.findMany({
    select: { id: true, serialId: true, title: true, screenshots: true },
    orderBy: { serialId: "asc" },
  })

  // ── 分类：逐条数「外链条数 / 已是本地 / 形状异常」，不改任何数据 ──
  const pending: Array<{ game: (typeof games)[number]; arr: string[]; indexes: number[] }> = []
  const malformed: Array<{ serialId: number; title: string; value: unknown }> = []
  let remoteCount = 0
  let localCount = 0

  for (const g of games) {
    const arr = toStringArray(g.screenshots)
    if (!arr) {
      malformed.push({ serialId: g.serialId, title: g.title, value: g.screenshots })
      continue
    }
    const indexes: number[] = []
    arr.forEach((s, i) => {
      if (isRemote(s)) { indexes.push(i); remoteCount++ }
      else if (s.startsWith("/")) localCount++
    })
    if (indexes.length) pending.push({ game: g, arr, indexes })
  }

  console.log("════════════════════════════════════════")
  console.log(dryRun ? " 主站 Game 截图外链本地化（DRY RUN，不落盘不写库）" : " 主站 Game 截图外链本地化")
  console.log("════════════════════════════════════════")
  console.log(`存储后端        : ${storage.name}`)
  console.log(`下载超时/重试   : ${DOWNLOAD_TIMEOUT_MS / 1000}s / 最多 ${DOWNLOAD_RETRIES} 次（间隔 ${RETRY_DELAY_MS / 1000}s）`)
  console.log(`Game 总数       : ${games.length}`)
  console.log(`待搬运截图(外链): ${remoteCount} 张，分布在 ${pending.length} 个游戏`)
  console.log(`已是本地(/开头) : ${localCount} 张，跳过`)
  if (malformed.length) {
    console.log(`截图字段形状异常，不动 : ${malformed.length} 个游戏（需人工确认）`)
    for (const m of malformed) {
      console.log(`    - serialId ${m.serialId} 「${m.title}」screenshots = ${JSON.stringify(m.value)}`)
    }
  }
  console.log("────────────────────────────────────────")

  let ok = 0
  const failures: Array<{ serialId: number; title: string; index: number; url: string; reason: string }> = []

  for (const { game, arr, indexes } of pending) {
    console.log(`serialId ${game.serialId} 「${game.title}」（${indexes.length} 张待搬运 / 共 ${arr.length} 张）`)

    // 只在副本上按下标改；失败项保留原值 ⇒ 数组长度与顺序永远不变
    const next = [...arr]
    let changed = false

    for (const i of indexes) {
      const src = arr[i]
      const label = `    第 ${i + 1}/${arr.length} 张`
      if (dryRun) {
        console.log(`${label} 将要替换: ${src}`)
        continue
      }

      console.log(label)
      console.log(`    来源: ${src}`)

      let buffer: Buffer
      let ext: string
      try {
        const got = await download(src)
        buffer = got.buffer
        ext = got.ext
        console.log(`    下载: ${(buffer.length / 1024).toFixed(1)} KB, ext=${ext}`)
      } catch (e) {
        const reason = `下载失败 - ${e instanceof Error ? e.message : String(e)}`
        console.warn(`    ✗ ${reason}（该下标保留原外链，继续下一张）`)
        failures.push({ serialId: game.serialId, title: game.title, index: i, url: src, reason })
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
        console.warn(`    ✗ ${reason}（该下标保留原外链，继续下一张）`)
        failures.push({ serialId: game.serialId, title: game.title, index: i, url: src, reason })
        continue
      }

      next[i] = url
      changed = true
      ok++
      console.log(`    ✓ ${url}`)
    }

    if (dryRun || !changed) continue

    // 最后一步才改库：整个数组一次性写回
    try {
      await prisma.game.update({ where: { id: game.id }, data: { screenshots: next } })
    } catch (e) {
      const reason = `DB 更新失败 - ${e instanceof Error ? e.message : String(e)}（文件已写入，但库内仍是外链）`
      console.error(`    ✗ ${reason}`)
      failures.push({ serialId: game.serialId, title: game.title, index: -1, url: "", reason })
    }
  }

  console.log("════════════════════════════════════════")
  if (dryRun) {
    console.log(`DRY RUN 结束：将要搬运 ${remoteCount} 张（未下载、未落盘、未写库）`)
    console.log("确认条数无误后去掉 --dry-run 正式执行。")
  } else {
    console.log(`成功 ${ok} 张 / 失败 ${failures.length} 张 / 已是本地跳过 ${localCount} 张`)
  }
  if (failures.length) {
    console.log("────────────────────────────────────────")
    console.log("失败明细（这些下标都保留原外链，数组长度与顺序未变）：")
    for (const f of failures) {
      console.log(`  - serialId ${f.serialId} 「${f.title}」${f.index >= 0 ? `第 ${f.index + 1} 张` : "（整组写库）"}`)
      console.log(`      原因: ${f.reason}`)
      if (f.url) console.log(`      外链: ${f.url}`)
    }
  }
  console.log("════════════════════════════════════════")
  if (failures.length) process.exitCode = 1
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[migrate-screenshots] 致命错误：", e)
    await prisma.$disconnect()
    process.exit(1)
  })
