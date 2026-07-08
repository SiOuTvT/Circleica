import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { prisma } from "@/lib/prisma"
import { cleanTags } from "@/lib/vndb-tags"

const VNDB_API = "https://api.vndb.org/kana"

/* ── 代理支持（与 src/lib/vndb.ts 保持一致） ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _proxyDispatcher: any = null
let _proxyInitialized = false

async function getProxyDispatcher() {
  if (_proxyInitialized) return _proxyDispatcher
  _proxyInitialized = true

  const proxyUrl = process.env.VNDB_API_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY

  try {
    const undici = await import("undici")

    if (proxyUrl) {
      _proxyDispatcher = new undici.ProxyAgent(proxyUrl)
      logger.db.debug("[VNDB Admin] 已配置代理", { proxy: proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") })
    } else {
      // 强制 IPv4：Node.js undici fetch 默认优先 IPv6，
      // 但很多国内网络 IPv6 到 api.vndb.org 不通，导致超时
      _proxyDispatcher = new undici.Agent({ connect: { family: 4 } })
      logger.db.debug("[VNDB Admin] 未配置代理，强制 IPv4 直连")
    }
  } catch (e) {
    logger.db.warn("[VNDB Admin] 无法加载 undici Agent，将使用默认 fetch", { error: e instanceof Error ? e.message : String(e) })
  }
  return _proxyDispatcher
}

/* ── 清理 VNDB BBCode 标记，只保留纯文本 ── */
function stripVndbMarkup(raw: string): string {
  if (!raw) return ""
  return raw
    .replace(/\[url=[^\]]*\]/gi, "")
    .replace(/\[\/url\]/gi, "")
    .replace(/\[spoiler\]/gi, "")
    .replace(/\[\/spoiler\]/gi, "")
    .replace(/\[b\]/gi, "")
    .replace(/\[\/b\]/gi, "")
    .replace(/\[i\]/gi, "")
    .replace(/\[\/i\]/gi, "")
    .replace(/\[u\]/gi, "")
    .replace(/\[\/u\]/gi, "")
    .replace(/\[s\]/gi, "")
    .replace(/\[\/s\]/gi, "")
    .replace(/\[code\]/gi, "")
    .replace(/\[\/code\]/gi, "")
    .replace(/\[quote\]/gi, "")
    .replace(/\[\/quote\]/gi, "")
    .replace(/\[raw\]/gi, "")
    .replace(/\[\/raw\]/gi, "")
    .replace(/\[color=[^\]]*\]/gi, "")
    .replace(/\[\/color\]/gi, "")
    .replace(/\[size=[^\]]*\]/gi, "")
    .replace(/\[\/size\]/gi, "")
    .replace(/\[sup\]/gi, "")
    .replace(/\[\/sup\]/gi, "")
    .replace(/\[sub\]/gi, "")
    .replace(/\[\/sub\]/gi, "")
    .replace(/\[url\]/gi, "")
    .replace(/\[spoiler=[^\]]*\]/gi, "")
    .replace(/\[[^\]]*?\]/g, "")  // 兜底：清除任何剩余标签
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/* ── POST /api/admin/vndb ── */
export const POST = withHandler(async (req) => {
  await requireAdminRole()

  // 确保预设标签组存在（VNDB 导入会引用 preset_detail_header）
  await ensurePresetTagGroups()

  const { vndbId } = await req.json()
  if (!vndbId?.trim()) {
    throw new AppError("请输入 VNDB 编号", "VALIDATION_ERROR", 422)
  }

  // 标准化 VNDB ID：纯数字自动加 "v" 前缀
  const vnId = /^\d+$/.test(vndbId.trim()) ? `v${vndbId.trim()}` : vndbId.trim()

  // 调用 VNDB Kana API（带超时 + 代理支持 + 重试）
  const dispatcher = await getProxyDispatcher()
  let vnRes: Response | null = null
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const fetchOptions: RequestInit & { dispatcher?: unknown } = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: ["id", "=", vnId],
          fields: "title,alttitle,aliases,description,released,tags.id,tags.name,tags.rating,developers.id,developers.name,staff.id,staff.name,staff.original,staff.role",
          results: 1,
        }),
        signal: AbortSignal.timeout(10000), // 10秒超时
      }
      if (dispatcher) {
        fetchOptions.dispatcher = dispatcher
      }
      // 使用 undici.fetch 代替全局 fetch（Next.js 的 fetch 会忽略 dispatcher 参数）
      if (dispatcher) {
        const undici = await import("undici")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vnRes = await (undici.fetch as any)(`${VNDB_API}/vn`, fetchOptions)
      } else {
        vnRes = await fetch(`${VNDB_API}/vn`, fetchOptions)
      }
      break // 成功则跳出重试循环
    } catch (fetchErr: unknown) {
      lastError = fetchErr as Error
      // fetch() 包装错误：TypeError: fetch failed 的实际错误码在 err.cause 中
      const err = fetchErr as Error & { code?: string; cause?: { code?: string } }
      const fCause = err?.cause
      const fCode = err?.code || fCause?.code
      const isNetworkError =
        fCode === 'ENOTFOUND' ||
        fCode === 'ETIMEDOUT' ||
        fCode === 'ECONNREFUSED' ||
        fCode === 'UND_ERR_CONNECT_TIMEOUT' ||
        err?.name === 'TimeoutError' ||
        err?.message?.includes('fetch failed')

      if (attempt < 2 && isNetworkError) {
        logger.db.debug(`[VNDB Admin] 网络错误 (${fCode || err?.message})，${attempt * 500}ms 后重试...`)
        await new Promise(r => setTimeout(r, attempt * 500))
        continue
      }
      throw fetchErr
    }
  }

  if (!vnRes) {
    throw lastError || new Error("VNDB 请求失败")
  }

  if (!vnRes.ok) {
    const errText = await vnRes.text()
    throw new AppError(`VNDB API 请求失败 (${vnRes.status}): ${errText}`, "INTERNAL", 502)
  }

  const vnData = await vnRes.json()
  if (!vnData.results?.length) {
    throw new AppError("未找到对应的 VNDB 游戏", "NOT_FOUND", 404)
  }

  const vn = vnData.results[0]

  /* ── 格子一：主推名称 ── */
  const aliases: string[] = vn.aliases ?? []

  // 从 aliases 中寻找中文名
  const chineseRegex = /[一-鿿]/
  const chineseAlias = aliases.find((a: string) => chineseRegex.test(a))
  const altTitle = vn.alttitle ?? ""

  // 主推名称：优先中文 alias → alttitle 中文 → alttitle → vn.title
  let primaryName = ""
  if (chineseAlias) {
    primaryName = chineseAlias
  } else if (altTitle && chineseRegex.test(altTitle)) {
    primaryName = altTitle
  } else if (altTitle) {
    primaryName = altTitle
  } else {
    primaryName = vn.title ?? ""
  }

  /* ── 格子二：日文官方原名 ── */
  const jpRegex = /[぀-ゟ゠-ヿ]/
  let japaneseName = ""
  if (altTitle && jpRegex.test(altTitle)) {
    japaneseName = altTitle
  } else if (jpRegex.test(vn.title ?? "")) {
    japaneseName = vn.title
  } else {
    const jpAlias = aliases.find((a: string) => jpRegex.test(a))
    if (jpAlias) japaneseName = jpAlias
  }

  /* ── 格子三：英文官方名称 ── */
  const enRegex = /^[a-zA-Z0-9\s\-'":!.,&()]+$/
  let englishName = ""
  if (enRegex.test(vn.title ?? "")) {
    englishName = vn.title
  } else {
    const enAlias = aliases.find((a: string) => enRegex.test(a.trim()))
    if (enAlias) englishName = enAlias
  }

  /* ── 格子四：搜索别名库 ── */
  const usedNames = new Set(
    [primaryName, japaneseName, englishName].filter(Boolean).map(n => n.trim()),
  )
  const extraAliases = aliases
    .filter((a: string) => !usedNames.has(a.trim()))
    .join(", ")

  /* ── 发售日期 ── */
  const released = vn.released ?? null

  /* ── 简介 ── */
  const rawDesc = vn.description ?? ""
  const cleanDesc = stripVndbMarkup(rawDesc)

  /* ── 标签（智能清洗：黑名单过滤 + 翻译 + 去重） ── */
  const vnTags: { name: string; rating?: number }[] = vn.tags ?? []
  const cleanedTagNames = cleanTags(
    vnTags.map((t) => ({ name: t.name, rating: t.rating ?? 0.5 })),
  )
  const tagNames = cleanedTagNames

  // 查询已有标签，找出缺失的
  const existingTags = await prisma.tag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true, name: true },
  })
  const existingNameSet = new Set(existingTags.map(t => t.name))

  // 自动创建缺失标签（默认分配到"详情页信息栏标签"组）
  const newTagNames = tagNames.filter(n => !existingNameSet.has(n))
  const newTags: { id: string; name: string }[] = []
  for (const name of newTagNames) {
    try {
      const created = await prisma.tag.create({
        data: { name, color: "#6b7280", groupId: "preset_detail_header" },
        select: { id: true, name: true },
      })
      newTags.push(created)
    } catch (err) {
      logger.db.warn("[VndbRoute] create tag failed (possible duplicate)", { error: err instanceof Error ? err.message : String(err) })
    }
  }

  // 所有匹配的标签 ID 列表
  const allTagIds = [...existingTags, ...newTags].map(t => t.id)

  /* ── 开发商 ── */
  const devs: { name: string }[] = vn.developers ?? []
  const studioName = devs.length > 0 ? devs.map((d) => d.name).join(", ") : ""

  /* ── 创作者（staff：脚本、原画、音乐等） ── */
  const staffList: Array<{ id: string; name: string; original?: string; role: string }> = vn.staff ?? []
  const creators = staffList
    .filter(s => s.id && s.name)
    .map(s => ({
      vndbId: String(s.id).replace("s", ""),
      name: s.name,
      nameJa: s.original || "",
      role: s.role || "other",
    }))
    .slice(0, 20)

  return json({
    title: primaryName,
    japaneseName,
    englishName,
    aliases: extraAliases,
    releaseDate: released,
    description: cleanDesc,
    studioName,
    tagIds: allTagIds,
    tagNames: [...existingTags, ...newTags].map(t => ({ id: t.id, name: t.name })),
    creators,
  })
})
