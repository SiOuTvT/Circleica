/**
 * DlsiteAdapter — Galvelica 数据源适配器之「DLsite」实现
 *
 * ⚠️ 重要说明：
 * 1. DLsite 没有官方、稳定的公开数据 API。本适配器只能「scrape 抓取」商品页
 *    （RJ/BJ 编号，如 https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html，
 *     或英文站 /eng/ 路径），从页面内嵌的 JSON-LD 与 Open Graph / meta 标签中抽取字段。
 * 2. 仅用于「手动补查」：由运营/维护人员按需触发单条查询，切勿写入任何自动、定时、
 *      批量抓取逻辑。每条请求前 await sleep(≥3000ms) 做限流，避免对 DLsite 造成压力。
 * 3. 成人内容（R-18）ToS 注意：DLsite 有年龄确认机制，抓取成人商品页需携带
 *    Cookie `age_check_done=1; adult=1` 以尝试越过年龄确认；若仍被拦截/降级，
 *    则优雅返回 null（不让调用方崩溃），绝不强爬。
 *
 * 已抽取的字段（尽量）：标题、社团/品牌名(studioName)、发售日(releaseDate, ISO)、
 * 封面图(coverImage)、简介(description)、类型/标签(tags，best-effort)、
 * 官方购买链接(officialUrl 指向 dlsite 商品页)。
 * search 为 best-effort：按标题在 DLsite 搜索结果页找 RJ/BJ id，失败时返回 []。
 *
 * 注意：本文件不依赖、不 import 任何国内源适配器（cngal/ymgal/bangumi 等）。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

const UA = "Circleica-Galvelica-Ingest/1.0 (+https://circleica.example)"
// 年龄确认 Cookie：尝试越过 DLsite 的 R-18 年龄确认；失败则优雅降级。
const AGE_COOKIE = "age_check_done=1; adult=1"

/** 单条请求前的最低间隔（毫秒）。仅手动补查，不做任何自动/定时逻辑。 */
const RATE_LIMIT_MS = 3000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------- 类型 ----------

interface DlsiteJsonLd {
  "@type"?: string
  "@graph"?: DlsiteJsonLd[]
  "@context"?: unknown
  name?: string
  image?: string | string[]
  description?: string
  url?: string
  datePublished?: string
  releaseDate?: string
  brand?: { "@type"?: string; name?: string }
}

// ---------- 工具函数 ----------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function getMeta(html: string, key: string, attr: "name" | "property"): string | undefined {
  // 兼容 <meta attr="key" content="..."> 与 <meta content="..." attr="key"> 两种顺序
  const patterns = [
    new RegExp(`<meta[^>]*\\b${attr}="${escapeRe(key)}"[^>]*\\bcontent="([^"]*)"`, "i"),
    new RegExp(`<meta[^>]*\\bcontent="([^"]*)"[^>]*\\b${attr}="${escapeRe(key)}"`, "i"),
  ]
  for (const re of patterns) {
    const m = re.exec(html)
    if (m && m[1]) return decodeEntities(m[1].trim())
  }
  return undefined
}

function isDlsiteUrl(u?: string): boolean {
  return !!u && /^https?:\/\/(www\.)?dlsite\.(com|jp)\//i.test(u)
}

function stripSiteSuffix(t: string): string {
  // DLsite 的 og:title 常以 " - DLsite" / " | DLsite" 结尾，去掉站点后缀
  return t.replace(/\s*[-|]\s*DLsite.*$/i, "").trim()
}

function normalizeDate(s?: string): string | undefined {
  if (!s) return undefined
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  if (iso) return iso[1]
  const jp = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(s)
  if (jp) {
    const y = jp[1]
    const m = jp[2].padStart(2, "0")
    const d = jp[3].padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  return undefined
}

function isAgeGate(html: string): boolean {
  // 被年龄确认拦截时，页面标题/正文中会出现相关字样
  return /年齢確認|年齢認証|歳確認|age[-_ ]?check/i.test(html.slice(0, 6000))
}

// ---------- 商品页解析 ----------

function findProductLd(node: unknown): DlsiteJsonLd | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findProductLd(item)
      if (r) return r
    }
    return null
  }
  if (node && typeof node === "object") {
    const o = node as DlsiteJsonLd
    if (o["@type"] === "Product") return o
    if (Array.isArray(o["@graph"])) {
      for (const g of o["@graph"]) {
        const r = findProductLd(g)
        if (r) return r
      }
    }
  }
  return null
}

function extractJsonLd(html: string): DlsiteJsonLd | null {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      const obj = JSON.parse(m[1].trim())
      const prod = findProductLd(obj)
      if (prod) return prod
    } catch {
      // 该段 JSON-LD 解析失败，跳过继续尝试下一段
    }
  }
  return null
}

/** best-effort：从商品页的「ジャンル（genre）」链接中抽取类型/标签 */
function extractGenres(html: string): { name: string; sourceId?: string }[] {
  const out: { name: string; sourceId?: string }[] = []
  const seen = new Set<string>()
  const re = /href="[^"]*genre\/[^"]*"[^>]*>([^<]+)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const name = decodeEntities(m[1].trim())
    if (name && !seen.has(name)) {
      seen.add(name)
      out.push({ name })
    }
    if (out.length >= 30) break
  }
  return out
}

// ---------- 网络请求（scrape-only，绝不抛错） ----------

async function dlsiteFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
        Cookie: AGE_COOKIE,
      },
      redirect: "follow",
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.length < 200) return null
    if (isAgeGate(text)) return null
    return text
  } catch {
    return null
  }
}

function normalizeProductId(raw: string): string | null {
  const s = (raw || "").trim()
  const direct = /^(RJ|BJ)\d{2,9}$/i.exec(s)
  if (direct) return direct[1].toUpperCase() + direct[2]
  // 允许 "dlsite:RJ123456" 或直接给 URL
  const urlm = /product_id=(RJ|BJ)(\d+)/i.exec(s)
  if (urlm) return urlm[1].toUpperCase() + urlm[2]
  return null
}

function buildUrl(id: string, lang: "jp" | "eng"): string {
  const subsite = id.toUpperCase().startsWith("BJ") ? "books" : "maniax"
  const host = lang === "eng" ? `www.dlsite.com/eng/${subsite}` : `www.dlsite.com/${subsite}`
  return `https://${host}/work/=/product_id/${id}.html`
}

// ---------- 适配器 ----------

class DlsiteAdapter implements SourceAdapter {
  readonly key: SourceKey = "DLSITE"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    const id = normalizeProductId(externalId)
    if (!id) return null
    // 限流：单条请求前至少等待 3 秒（仅手动补查场景）
    await sleep(RATE_LIMIT_MS)
    // 先抓日文站，失败再回退英文站
    const jp = await dlsiteFetch(buildUrl(id, "jp"))
    if (typeof jp === "string" && jp.length > 0) return jp
    const eng = await dlsiteFetch(buildUrl(id, "eng"))
    if (typeof eng === "string" && eng.length > 0) return eng
    return null
  }

  normalize(payload: unknown): NormalizedWork {
    if (typeof payload !== "string" || payload.trim().length === 0) return {}
    const html = payload
    const ld = extractJsonLd(html)

    const rawTitle = (ld?.name || getMeta(html, "og:title", "property") || "").trim()
    const title = stripSiteSuffix(rawTitle)

    const coverRaw = Array.isArray(ld?.image)
      ? ld!.image[0] || ""
      : ld?.image || getMeta(html, "og:image", "property") || ""
    const coverImage = (coverRaw || "").trim()

    const description = (
      ld?.description ||
      getMeta(html, "og:description", "property") ||
      getMeta(html, "description", "name") ||
      ""
    ).trim()

    const brand = (ld?.brand?.name || "").trim()
    const releaseDate = normalizeDate(ld?.datePublished || ld?.releaseDate)
    const url = (ld?.url || getMeta(html, "og:url", "property") || "").trim()
    const officialUrl = isDlsiteUrl(url) ? url : undefined

    const tags = extractGenres(html)

    return {
      title: title || undefined,
      studioName: brand || undefined,
      releaseDate,
      coverImage: coverImage || undefined,
      description: description || undefined,
      officialUrl,
      tags: tags.length ? tags : undefined,
    }
  }

  async search(query: string): Promise<{ externalId: string; title: string }[]> {
    const q = (query || "").trim()
    if (!q) return []
    await sleep(RATE_LIMIT_MS)
    // best-effort：在 DLsite 搜索结果页中找 product_id=RJ/BJ 链接
    const url = `https://www.dlsite.com/maniax/fsr/=/language/jp/keyword/${encodeURIComponent(q)}`
    const html = await dlsiteFetch(url)
    if (!html) return []
    return parseSearchResults(html)
  }
}

function parseSearchResults(html: string): { externalId: string; title: string }[] {
  const out: { externalId: string; title: string }[] = []
  const seen = new Set<string>()
  // 尽量同时捕获 id 与锚点标题文本
  const re = /product_id=(RJ|BJ)(\d+)\.html"[^>]*>([^<]+)</gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const id = m[1].toUpperCase() + m[2]
    if (seen.has(id)) continue
    seen.add(id)
    const title = stripSiteSuffix(decodeEntities(m[3].trim())) || id
    out.push({ externalId: id, title })
    if (out.length >= 10) break
  }
  if (out.length > 0) return out
  // 退化：只抓到 id、抓不到标题时，仍返回 id（title 用 id 兜底）
  const idRe = /product_id=(RJ|BJ)(\d+)/gi
  while ((m = idRe.exec(html))) {
    const id = m[1].toUpperCase() + m[2]
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ externalId: id, title: id })
    if (out.length >= 10) break
  }
  return out
}

export const dlsiteAdapter = new DlsiteAdapter()
export default dlsiteAdapter
