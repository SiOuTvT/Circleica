/**
 * ErogameScape 适配器（日本权威 galge 数据库，海外玩家公认）。
 *
 * ⚠️ 重要：ErogameScape 在中国大陆大概率被 GFW 阻断。本适配器只有在服务器具备
 * 出口代理 / 网络可达性时才能摄入（出口代理属于 infra，按分工由用户侧配置）。
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
    const g = (payload ?? {}) as Record<string, any>
    const makers: any[] = Array.isArray(g.makers) ? g.makers : g.maker ? [g.maker] : []
    const studioName = makers.map((m) => m?.name).filter(Boolean).join(", ")
    const cover = typeof g.image === "string" ? g.image : g.image?.url ?? ""
    return {
      title: g.title || g.name || "",
      originalWork: g.kana || g.original || "",
      englishName: g.english || "",
      description: g.description || "",
      coverImage: cover,
      releaseDate: g.selldate ? String(g.selldate).slice(0, 10) : "",
      studioName,
      tags: [],
      creators: [],
    }
  }

  /** 分页拉取游戏列表，用于批量摄入。返回原始 game 对象数组。 */
  async listGames(page = 1, perPage = 100): Promise<any[]> {
    const data = await egsFetch(`/api/v1/games?page=${page}&per_page=${perPage}`)
    if (Array.isArray(data)) return data
    if (Array.isArray((data as any)?.games)) return (data as any).games
    return []
  }
}

export const erogesapeAdapter = new ErogameScapeAdapter()
export default erogesapeAdapter
