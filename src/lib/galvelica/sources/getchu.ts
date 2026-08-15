/**
 * GetchuAdapter — Galvelica 数据源适配器之「Getchu（げっちゅ屋）」实现
 *
 * Getchu 无官方公开 API，只能 scrape 商品页（www.getchu.com/products/{id} 为主，
 * dl.getchu.com/i/nscore/id/{id} 亦可）。成人向内容需带 cookie `getchu_adalt_flag=1`
 * 越过年龄确认，否则只能抓到受限 / 降级页面（本适配器默认带上该 cookie + ITEM_HISTORY，
 * 若被服务端忽略也只是拿到降级页，不抛错）。
 *
 * 注意：
 *  - 本适配器为「手动补查」专用（MANUAL 流程里人工粘贴 Getchu 商品 ID 时调用），
 *    不实现任何自动 / 定时抓取逻辑。
 *  - 限流：单条请求前 await sleep(≥3s)，避免被封。
 *  - 任何网络 / 解析失败一律返回 null / []，不让调用方崩溃。
 *  - 解析全部为 best-effort（HTML 结构随时可能变），字段缺失即留空，不臆造。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

const GETCHU_AGE_COOKIE = "getchu_adalt_flag=1; ITEM_HISTORY=1"
const GETCHU_RATE_MS = 3000
const UA = "Circleica-Galvelica-Ingest/1.0 (+https://circleica.example)"

/** 抓取内部载荷：同时保留原始 id，便于 normalize 还原官方链接。 */
interface GetchuPayload {
  html: string
  id: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
}

/** 带年龄 cookie 的 HTML 抓取；任何失败返回 null。 */
async function getchuFetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.8",
        Cookie: GETCHU_AGE_COOKIE,
      },
      redirect: "follow",
    })
    if (!res.ok) return null
    const text = await res.text()
    return text && text.length > 0 ? text : null
  } catch {
    return null
  }
}

/** 取 <meta property/name="prop" content="..."> 的 content（兼容两种属性顺序）。 */
function metaContent(html: string, prop: string): string | undefined {
  const p = escapeRegExp(prop)
  const order1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`,
    "i",
  )
  const m1 = order1.exec(html)
  if (m1) return decodeEntities(m1[1].trim())
  const order2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`,
    "i",
  )
  const m2 = order2.exec(html)
  return m2 ? decodeEntities(m2[1].trim()) : undefined
}

/** 取 <th>LABEL</th><td>...</td> 单元格文本（Getchu 详情表常用结构，best-effort）。 */
function extractCell(html: string, label: string): string | undefined {
  const re = new RegExp(
    `${escapeRegExp(label)}<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
    "i",
  )
  const m = re.exec(html)
  if (!m) return undefined
  const text = decodeEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
  return text || undefined
}

function extractTitle(html: string): string | undefined {
  const og = metaContent(html, "og:title")
  if (og) return og
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return m ? decodeEntities(m[1].replace(/\s+/g, " ").trim()) : undefined
}

function extractCover(html: string): string | undefined {
  const og = metaContent(html, "og:image")
  if (og) return og
  // 兜底：class 含 package / product 的 <img>
  const m = /<img[^>]+class=["'][^"']*(?:package|product)[^"']*["'][^>]+src=["']([^"']+)["']/i.exec(
    html,
  )
  return m ? m[1] : undefined
}

function extractDescription(html: string): string | undefined {
  const og = metaContent(html, "og:description")
  if (og) return og
  return metaContent(html, "description")
}

function extractStudio(html: string): string | undefined {
  // 优先品牌，其次厂商、社团
  for (const label of ["ブランド", "メーカー", "サークル"]) {
    const cell = extractCell(html, label)
    if (cell) return cell
  }
  return undefined
}

/** 解析中日混合日期为 ISO（YYYY-MM-DD，或仅年-月时为 YYYY-MM），best-effort。 */
function parseJapaneseDate(s: string): string | undefined {
  const full = s.match(/(\d{4})[年/\.\-](\d{1,2})[月/\.\-](\d{1,2})/)
  if (full) return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`
  const ym = s.match(/(\d{4})[年/\.\-](\d{1,2})/)
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}`
  return undefined
}

function extractReleaseDate(html: string): string | undefined {
  const cell = extractCell(html, "発売日")
  if (cell) return parseJapaneseDate(cell)
  // 兜底：行内「発売日：YYYY/MM/DD」
  const m = /発売日[：:]\s*([\d]{4}[年/\.\-][\d]{1,2}[月/\.\-][\d]{1,2})/i.exec(html)
  if (m) return parseJapaneseDate(m[1])
  return undefined
}

function extractTags(html: string): { name: string; sourceId?: string }[] {
  const cell = extractCell(html, "ジャンル")
  if (!cell) return []
  const parts = cell
    .split(/[\/、,]/)
    .map((s) => decodeEntities(s.trim()))
    .filter(Boolean)
  return parts.map((name) => ({ name }))
}

class GetchuAdapter implements SourceAdapter {
  readonly key: SourceKey = "GETCHU"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    const id = (externalId || "").replace(/[^0-9]/g, "")
    if (!id) return null
    await sleep(GETCHU_RATE_MS)
    const url = `https://www.getchu.com/products/${id}`
    const html = await getchuFetchHtml(url)
    if (!html) return null
    return { html, id } satisfies GetchuPayload
  }

  normalize(payload: unknown): NormalizedWork {
    const p = payload as GetchuPayload | null
    if (!p || !p.html) return {}

    const html = p.html
    const title = extractTitle(html)
    const cover = extractCover(html)
    const description = extractDescription(html)
    const studio = extractStudio(html)
    const releaseDate = extractReleaseDate(html)
    const tags = extractTags(html)

    const officialUrl = p.id ? `https://www.getchu.com/products/${p.id}` : undefined

    return {
      title,
      coverImage: cover,
      description,
      studioName: studio,
      releaseDate,
      tags: tags.length ? tags : undefined,
      officialUrl,
    }
  }

  async search(query: string): Promise<{ externalId: string; title: string }[]> {
    const q = (query || "").trim()
    if (!q) return []
    await sleep(GETCHU_RATE_MS)
    const url = `https://www.getchu.com/products/list.php?kind=all&sort=news&word=${encodeURIComponent(q)}`
    const html = await getchuFetchHtml(url)
    if (!html) return []
    try {
      const results: { externalId: string; title: string }[] = []
      const seen = new Set<string>()
      const re = /<a[^>]+href=["']\/products\/(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi
      let m: RegExpExecArray | null
      while ((m = re.exec(html)) !== null && results.length < 10) {
        const id = m[1]
        if (seen.has(id)) continue
        seen.add(id)
        const title = decodeEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        results.push({ externalId: id, title: title || id })
      }
      return results
    } catch {
      return []
    }
  }
}

export const getchuAdapter = new GetchuAdapter()
export default getchuAdapter
