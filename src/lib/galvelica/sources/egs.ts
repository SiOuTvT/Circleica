/**
 * ErogameScape 适配器（日本权威 galge 数据库）。
 *
 * ⚠️ 本适配器需要服务器具备出口代理或网络可达性。
 * 字段按 EGS API 已知结构做防御性归一，缺失字段优雅留空；网络不可达时 fetch 抛错，
 * 调用方（摄入脚本）捕获后跳过该源，不污染其它源。
 *
 * 默认不启用：ingest-entrypoint.sh 仅当 GALVELICA_ENABLE_EGS=1 才跑；doujin-gate 亦不将其
 * 列入默认白名单（EGS 无干净「同人」标记，摄入时统一按 DERIVATIVE 兜底，且不新建未匹配作品）。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

const EGS_API_BASE = (process.env.EGS_API_BASE ?? "https://erogesape.net").replace(/\/$/, "")

async function egsFetch(path: string, timeoutMs = 15000): Promise<unknown> {
  const url = `${EGS_API_BASE}${path}`
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`EGS HTTP ${res.status} @ ${url}`)
  return res.json()
}

class ErogameScapeAdapter implements SourceAdapter {
  readonly key: SourceKey = "EROGESCAPE"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    try {
      return await egsFetch(`/api/v1/games/${encodeURIComponent(externalId)}`)
    } catch {
      return null
    }
  }

  normalize(payload: unknown): NormalizedWork {
    const g = (payload ?? {}) as Record<string, unknown>
    const str = (v: unknown): string => (typeof v === "string" ? v : "")
    const makers: Array<Record<string, unknown>> = Array.isArray(g.makers)
      ? (g.makers as Array<Record<string, unknown>>)
      : g.maker ? [g.maker as Record<string, unknown>] : []
    const studioName = makers.map((m) => m?.name).filter(Boolean).join(", ")
    const coverUrl = (g.image as Record<string, unknown> | null)?.url
    const cover = typeof g.image === "string"
      ? g.image
      : typeof coverUrl === "string"
        ? coverUrl
        : ""
    return {
      title: str(g.title) || str(g.name),
      originalWork: str(g.kana) || str(g.original),
      englishName: str(g.english),
      description: str(g.description),
      coverImage: cover,
      releaseDate: g.selldate ? String(g.selldate).slice(0, 10) : "",
      studioName,
      tags: [],
      creators: [],
    }
  }

  /** 分页拉取游戏列表，用于批量摄入。返回原始 game 对象数组。 */
  async listGames(page = 1, perPage = 100): Promise<unknown[]> {
    const data = await egsFetch(`/api/v1/games?page=${page}&per_page=${perPage}`)
    if (Array.isArray(data)) return data
    if (Array.isArray((data as Record<string, unknown>)?.games)) {
      return (data as Record<string, unknown>).games as unknown[]
    }
    return []
  }
}

export const erogesapeAdapter = new ErogameScapeAdapter()
export default erogesapeAdapter
