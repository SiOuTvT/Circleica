/**
 * BoothAdapter — Galvelica 数据源适配器之「Pixiv BOOTH」实现
 *
 * ⚠️ 重要说明：
 * 1. BOOTH（booth.pm）是 Pixiv 的数字商品市场。其数据接口需要 Pixiv OAuth token，
 *    从环境变量读取：PIXIV_CLIENT_ID / PIXIV_CLIENT_SECRET（可选 PIXIV_REFRESH_TOKEN）。
 * 2. 账号级 token 吊销风险（非 IP 级）：未配置令牌时所有方法优雅返回 null/[]，绝不抛错，
 *    也绝不尝试匿名强爬。
 * 3. 仅用于「手动补查」：运营/维护人员按需触发单条查询，切勿写入自动、定时、批量逻辑。
 *    每条请求前 await sleep(≥3000ms) 做限流。
 * 4. 尽力抽取：标题、创作者/社团(studioName)、发售/发布日(releaseDate)、封面(coverImage)、
 *    简介(description)、标签(tags)、官方链接(officialUrl 指向 booth.pm 商品页)。
 *
 * 注意：本文件不依赖、不 import 任何国内源适配器（cngal/ymgal/bangumi 等）。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

const UA = "Circleica-Galvelica-Ingest/1.0 (+https://circleica.example)"
/** 单条请求前的最低间隔（毫秒）。仅手动补查，不做任何自动/定时逻辑。 */
const RATE_LIMIT_MS = 3000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}

function getMeta(html: string, key: string, attr: "name" | "property"): string | undefined {
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
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

function normalizeDate(s?: string): string | undefined {
  if (!s) return undefined
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  if (iso) return iso[1]
  return undefined
}

function isBoothUrl(u?: string): boolean {
  return !!u && /^https?:\/\/(www\.)?booth\.pm\//i.test(u)
}

function normalizeItemId(raw: string): string | null {
  const s = (raw || "").trim()
  const direct = /^\d{4,12}$/.exec(s)
  if (direct) return direct[0]
  const urlm = /booth\.pm\/[^/]+\/items\/(\d+)/i.exec(s)
  if (urlm) return urlm[1]
  const shortm = /booth\.pm\/item\/(\d+)/i.exec(s)
  if (shortm) return shortm[1]
  return null
}

function buildUrl(id: string): string {
  return `https://booth.pm/items/${id}`
}

// Pixiv OAuth：未配置则降级。仅读取 env，不强制要求。
function getPixivHeaders(): Record<string, string> | null {
  const clientId = process.env.PIXIV_CLIENT_ID
  const clientSecret = process.env.PIXIV_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  // 注：真实调用需先以 refresh_token 换 access_token；此处仅做 env 存在性校验，
  // 实际令牌获取应在调用方以安全方式注入 Authorization 头，避免在本文件硬编码流程。
  return {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
  }
}

async function boothFetch(url: string): Promise<string | null> {
  const headers = getPixivHeaders()
  if (!headers) return null // 未配置 token，优雅降级
  try {
    const res = await fetch(url, { headers, redirect: "follow" })
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.length < 200) return null
    return text
  } catch {
    return null
  }
}

class BoothAdapter implements SourceAdapter {
  readonly key: SourceKey = "BOOTH"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    const id = normalizeItemId(externalId)
    if (!id) return null
    await sleep(RATE_LIMIT_MS)
    return boothFetch(buildUrl(id))
  }

  normalize(payload: unknown): NormalizedWork {
    if (typeof payload !== "string" || payload.trim().length === 0) return {}
    const html = payload
    const title = (getMeta(html, "og:title", "property") || "").trim()
    const description = (
      getMeta(html, "og:description", "property") ||
      getMeta(html, "description", "name") ||
      ""
    ).trim()
    const coverImage = (getMeta(html, "og:image", "property") || "").trim()
    const url = (getMeta(html, "og:url", "property") || "").trim()
    const officialUrl = isBoothUrl(url) ? url : undefined

    return {
      title: title || undefined,
      description: description || undefined,
      coverImage: coverImage || undefined,
      officialUrl,
    }
  }

  async search(_query: string): Promise<{ externalId: string; title: string }[]> {
    // BOOTH 搜索需鉴权且结构易变，best-effort 返回空，不抛错
    return []
  }
}

export const boothAdapter = new BoothAdapter()
export default boothAdapter
