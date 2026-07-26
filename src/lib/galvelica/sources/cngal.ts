/**
 * CngalAdapter — Galvelica 数据源适配器之「CnGal 资料站」实现
 *
 * CnGal（cngal.org）是中文 ACG 资料站，含大量国产 / 汉化同人 galgame。
 * 公开 API（api.cngal.org/api）：
 *   - GET  /api/entries/GetEntryView/{id}      作品详情（含原名/别名/简介/封面/制作组/Staff）
 *   - POST /api/entries/GetEntryHomeList      分页检索（含筛选/搜索）
 *   - GET  /api/entries/GetPublishGamesByTime  按年月列出当月发售游戏（广收录主力接口）
 * 匿名可访问；若配置 CNGL_API_TOKEN 则作为 Bearer 令牌附加（用于提额/鉴权，缺失自动降级）。
 *
 * CnGal 以同人/独立 VN 为主，列入 DOUJIN_CURATED（严格同人模式下默认收录）。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"
import { sourceAllowed } from "./doujin-gate"

const CNGL_BASE = "https://api.cngal.org/api"
const CNGL_TOKEN = process.env.CNGL_API_TOKEN || ""
const UA = "Circleica-Galvelica-Ingest/1.0 (+https://circleica.example)"

interface CngalStaffGroup {
  modifier?: string | null
  staffList?: { modifier?: string | null; names?: { displayName?: string; id?: number }[] }[]
}
interface CngalEntry {
  id?: number
  name?: string | null
  anotherName?: string | null
  briefIntroduction?: string | null
  mainPicture?: string | null
  mainImage?: string | null
  publishTime?: string | null
  productionGroups?: { displayName?: string; id?: number }[]
  publishers?: { displayName?: string; id?: number }[]
  type?: string
  information?: { name?: string; value?: string; icon?: string }[]
  staffs?: CngalStaffGroup[]
}
interface CngalListEntry {
  id?: number
  type?: string
  name?: string | null
  mainImage?: string | null
  briefIntroduction?: string | null
  publishTime?: string | null
}
interface CngalPaged<T> {
  totalCount?: number
  totalPages?: number
  data?: T[]
}

function tokenReady(): boolean {
  return CNGL_TOKEN.trim().length > 0
}

async function cngalFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": UA,
      ...(init?.headers as Record<string, string> | undefined),
    }
    if (tokenReady()) headers["Authorization"] = `Bearer ${CNGL_TOKEN}`
    const res = await fetch(`${CNGL_BASE}${path}`, { ...init, headers })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function toStr(v: number | string | undefined | null): string {
  return v == null ? "" : String(v)
}

function dateOnly(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso)
  return m ? m[1] : undefined
}

class CngalAdapter implements SourceAdapter {
  readonly key: SourceKey = "CNGL"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    if (!sourceAllowed(this.key)) return null
    const id = toStr(externalId).replace(/^cng/i, "").trim()
    if (!/^\d+$/.test(id)) return null
    const data = await cngalFetch<CngalEntry>(`/entries/GetEntryView/${id}`)
    if (!data || data.id == null) return null
    return data
  }

  normalize(payload: unknown): NormalizedWork {
    const e = payload as CngalEntry | null
    if (!e) return {}

    const name = (e.name || "").trim()
    const another = (e.anotherName || "").trim()

    const aliases: string[] = []
    if (another && another !== name) aliases.push(another)
    for (const inf of e.information ?? []) {
      if ((inf.name || "").includes("别称") && inf.value) {
        const v = inf.value.trim()
        if (v && v !== name && !aliases.includes(v)) aliases.push(v)
      }
    }

    const creators = (e.staffs ?? [])
      .flatMap((g) =>
        (g.staffList ?? []).flatMap((sl) =>
          (sl.names ?? [])
            .filter((n) => (n.displayName || "").trim().length > 0)
            .map((n) => ({
              name: (n.displayName || "").trim(),
              role: (g.modifier || sl.modifier || "other").trim(),
              sourceId: toStr(n.id) || undefined,
            })),
        ),
      )

    const studio = (e.productionGroups ?? [])
      .map((p) => (p.displayName || "").trim())
      .filter(Boolean)
    const studioName = Array.from(new Set(studio)).join(", ")

    const cover = (e.mainPicture || e.mainImage || "").trim()

    return {
      title: name,
      originalWork: another && another !== name ? another : "",
      aliases,
      description: (e.briefIntroduction || "").trim(),
      coverImage: cover,
      releaseDate: dateOnly(e.publishTime),
      studioName: studioName || undefined,
      creators,
    }
  }

  async search(query: string): Promise<{ externalId: string; title: string }[]> {
    if (!sourceAllowed(this.key)) return []
    const body = { currentPage: 1, maxResultCount: 10, filterText: query }
    const res = await cngalFetch<CngalPaged<CngalListEntry>>(`/entries/GetEntryHomeList`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return (res?.data ?? [])
      .filter((d) => (d.type || "") === "Game" && d.id != null)
      .map((d) => ({ externalId: toStr(d.id), title: (d.name || "").trim() || toStr(d.id) }))
  }
}

export const cngalAdapter = new CngalAdapter()
export default cngalAdapter

/**
 * 广收录：按年月列出 CnGal 当月发售游戏。返回游戏列表（含 id/name/mainImage/briefIntroduction/publishTime）；
 * 不可达返回 null。供 scripts/ingest-cngal.ts 使用。
 */
export async function listCngalByMonth(year: number, month: number): Promise<CngalListEntry[] | null> {
  if (!sourceAllowed("CNGL")) return null
  const data = await cngalFetch<CngalListEntry[]>(
    `/entries/GetPublishGamesByTime?year=${year}&month=${month}`,
  )
  if (!Array.isArray(data)) return null
  return data.filter((g) => (g.type || "") === "Game")
}
