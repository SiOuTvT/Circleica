/**
 * FuwanovelAdapter — Galvelica 数据源适配器之「Fuwanovel」实现
 *
 * ⚠️ 重要说明：
 * 1. Fuwanovel（fuwanovel.net）是英文视觉小说汉化 / 资料社区，没有公开、稳定的官方数据 API。
 *    其 wiki / 项目页结构易变，抓取脆弱，需做好容错。
 * 2. 仅用于「手动补查」：由运营/维护人员按需触发单条查询，切勿写入任何自动、定时、
 *    批量抓取逻辑。每条请求前 await sleep(≥5000ms) 做限流。
 * 3. 尽力抽取的字段：标题、简介(description)、封面(coverImage)、发售日(releaseDate)、
 *    制作组(studioName)、标签(tags，best-effort)。解析失败则留空，绝不抛错。
 *
 * 注意：本文件不依赖、不 import 任何国内源适配器（cngal/ymgal/bangumi 等）。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

const UA = "Circleica-Galvelica-Ingest/1.0 (+https://circleica.example)"
/** 单条请求前的最低间隔（毫秒）。仅手动补查，不做任何自动/定时逻辑。 */
const RATE_LIMIT_MS = 5000

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
    .replace(/&apos;/g, "'")
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

function stripSuffix(t: string): string {
  return t.replace(/\s*[-|]\s*(Fuwanovel|FuwaNovel).*$/i, "").trim()
}

async function fnvFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.length < 200) return null
    return text
  } catch {
    return null
  }
}

function normalizeProjectId(raw: string): string | null {
  const s = (raw || "").trim()
  const direct = /^\d{2,7}$/.exec(s)
  if (direct) return direct[0]
  const urlm = /fuwanovel\.net\/(?:projects|visual-novel)\/(\d+)/i.exec(s)
  if (urlm) return urlm[1]
  return null
}

function buildUrl(id: string): string {
  return `https://fuwanovel.net/projects/${id}`
}

class FuwanovelAdapter implements SourceAdapter {
  readonly key: SourceKey = "FUWANOVEL"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    const id = normalizeProjectId(externalId)
    if (!id) return null
    await sleep(RATE_LIMIT_MS)
    return fnvFetch(buildUrl(id))
  }

  normalize(payload: unknown): NormalizedWork {
    if (typeof payload !== "string" || payload.trim().length === 0) return {}
    const html = payload
    const title = stripSuffix(getMeta(html, "og:title", "property") || "").trim()
    const description = (
      getMeta(html, "og:description", "property") ||
      getMeta(html, "description", "name") ||
      ""
    ).trim()
    const coverImage = (getMeta(html, "og:image", "property") || "").trim()
    const url = (getMeta(html, "og:url", "property") || "").trim()
    const officialUrl = /^https?:\/\/fuwanovel\.net\//i.test(url) ? url : undefined

    // best-effort：发布日与制作组很难从静态页稳定抽取，留空由人工补全
    return {
      title: title || undefined,
      description: description || undefined,
      coverImage: coverImage || undefined,
      officialUrl,
    }
  }

  async search(_query: string): Promise<{ externalId: string; title: string }[]> {
    // Fuwanovel 搜索结构脆弱，best-effort 返回空，不抛错
    return []
  }
}

export const fuwanovelAdapter = new FuwanovelAdapter()
export default fuwanovelAdapter
