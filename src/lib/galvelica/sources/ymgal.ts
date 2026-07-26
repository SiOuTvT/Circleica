/**
 * YmGalAdapter — Galvelica 数据源适配器之「月幕 Galgame」实现
 *
 * 月幕是中文 galgame 档案站，提供**开放免费 API（OAuth2 公共凭证、无门槛）**。
 * 对中文向站点价值极高：补全中文译名 / 别名 / 封面 / 制作人员，且 VNDB/Bangumi 缺中文名时
 * 由月幕补位（见融合优先级表）。
 *
 * 注意：月幕 Game 模型**无 tags 字段**，标签仍由 VNDB / Bangumi 提供；月幕只补
 * 标题 / 别名 / 简介 / 封面 / 制作人员。这是设计取舍，非遗漏。
 *
 * ⚠️ 闸门：月幕是「galge 广义」源（含商业品牌），默认严格同人模式下不收录，
 * 需设 GALVELICA_DOUJIN_ONLY=0 才放开（见 sources/doujin-gate.ts）。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"
import { sourceAllowed } from "./doujin-gate"

const YMGAL_BASE = "https://www.ymgal.games"
const YMGAL_CLIENT_ID = "ymgal"
const YMGAL_CLIENT_SECRET = "luna0327"

interface YmGalToken {
  access_token: string
  expiresAt: number
}
let tokenCache: YmGalToken | null = null

interface YmGalGame {
  gid?: number | string
  id?: number | string
  name?: string
  chineseName?: string
  extensionName?: { name?: string; type?: string; desc?: string }[]
  introduction?: string
  releaseDate?: string
  developerId?: number | string
  mainImg?: string
  staff?: { pid?: number | string; empName?: string; jobName?: string }[]
  haveChinese?: boolean
  state?: string
}

interface YmGalEnvelope<T> {
  success?: boolean
  code?: number
  msg?: string
  data?: T
}

async function getToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.access_token
  try {
    const res = await fetch(
      `${YMGAL_BASE}/oauth/token?grant_type=client_credentials&client_id=${YMGAL_CLIENT_ID}&client_secret=${YMGAL_CLIENT_SECRET}&scope=public`,
      { headers: { Accept: "application/json;charset=utf-8" } },
    )
    if (!res.ok) return null
    const json = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!json.access_token) return null
    tokenCache = {
      access_token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    }
    return json.access_token
  } catch {
    return null
  }
}

async function ymgalFetch<T>(path: string): Promise<T | null> {
  const token = await getToken()
  if (!token) return null
  try {
    const res = await fetch(`${YMGAL_BASE}${path}`, {
      headers: {
        Accept: "application/json;charset=utf-8",
        Authorization: `Bearer ${token}`,
        version: "1",
      },
    })
    if (!res.ok) return null
    const env = (await res.json()) as YmGalEnvelope<T>
    if (env.success === false || (env.code != null && env.code !== 0)) return null
    return env.data ?? null
  } catch {
    return null
  }
}

function toStr(v: number | string | undefined): string {
  return v == null ? "" : String(v)
}

class YmGalAdapter implements SourceAdapter {
  readonly key: SourceKey = "YMGAL"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    if (!sourceAllowed(this.key)) return null
    const gid = toStr(externalId).replace(/^ymg/i, "").trim()
    if (!/^\d+$/.test(gid)) return null
    const data = await ymgalFetch<{ game?: YmGalGame }>(`/open/archive?gid=${gid}`)
    if (!data?.game) return null
    return data.game
  }

  normalize(payload: unknown): NormalizedWork {
    const g = payload as YmGalGame | null
    if (!g) return {}

    const jp = (g.name || "").trim()
    const cn = (g.chineseName || "").trim()
    const title = cn || jp

    const aliases = (g.extensionName ?? [])
      .map((e) => (e?.name || "").trim())
      .filter((n) => n.length > 0 && n !== title)

    const creators = (g.staff ?? [])
      .filter((s) => (s.empName || "").trim().length > 0)
      .map((s) => ({
        name: (s.empName || "").trim(),
        role: (s.jobName || "").trim() || "other",
        sourceId: toStr(s.pid) || undefined,
      }))

    return {
      title,
      originalWork: cn && jp && cn !== jp ? jp : "",
      aliases,
      description: (g.introduction || "").trim(),
      coverImage: (g.mainImg || "").trim(),
      releaseDate: (g.releaseDate || "").trim() || undefined,
      creators,
      // 月幕无 tags 字段，标签由 VNDB / Bangumi 提供
    }
  }

  async search(query: string): Promise<{ externalId: string; title: string }[]> {
    if (!sourceAllowed(this.key)) return []
    const data = await ymgalFetch<{ result?: YmGalGame[] }>(
      `/open/archive/search-game?mode=list&keyword=${encodeURIComponent(query)}&pageNum=1&pageSize=10`,
    )
    const list = data?.result ?? []
    return list
      .map((g) => ({
        externalId: toStr(g.gid ?? g.id),
        title: (g.chineseName || g.name || "").trim() || toStr(g.gid ?? g.id),
      }))
      .filter((r) => r.externalId && /^\d+$/.test(r.externalId))
  }
}

export const ymgalAdapter = new YmGalAdapter()
export default ymgalAdapter

/**
 * 批量枚举：按发售日期区间翻页列出月幕游戏（供广收录脚本使用）。
 * 返回游戏数组；不可达 / 被闸门拦截 / 空页返回 null。
 */
export async function listYmGalByDateRange(
  startDate: string,
  endDate: string,
  pageNum: number,
  pageSize = 50,
): Promise<YmGalGame[] | null> {
  if (!sourceAllowed("YMGAL")) return null
  return ymgalFetch<YmGalGame[]>(
    `/open/archive/game?releaseStartDate=${startDate}&releaseEndDate=${endDate}&pageNum=${pageNum}&pageSize=${pageSize}`,
  )
}
