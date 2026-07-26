/**
 * SteamAdapter — Galvelica 数据源适配器之「Steam 商店」实现（发现层）
 *
 * Steam 商店 API 无需密钥（store.steampowered.com/api）。用于「发现层」：
 * 现有源（VNDB/Bangumi/Cngal）可能漏掉的新 VN / 同人 galgame，可在 Steam 上按
 * 关键词（visual novel / dating sim / otome …）检索并校验 genre，发现后建 Work（STEAM）。
 *
 * 字段覆盖：标题 / 简介 / 封面 / 发售日 / Steam appid / 标签(genre)。
 * Steam 是商业商店，混入大量非同人作，故本适配器只产出「经 isVisualNovelApp 校验」的 VN 作品。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

const STEAM_STORE = "https://store.steampowered.com/api"
const UA = "Circleica-Galvelica-Ingest/1.0 (+https://circleica.example)"

interface SteamSearchItem {
  id?: number
  name?: string
}
interface SteamSearchResult {
  items?: SteamSearchItem[]
  total?: number
}
interface SteamAppDetails {
  type?: string
  name?: string
  steam_appid?: number
  short_description?: string
  header_image?: string
  release_date?: { date?: string }
  genres?: { id?: number; description?: string }[]
  categories?: { id?: number; description?: string }[]
  is_free?: boolean
}
interface SteamAppResponse {
  [appid: string]: { success?: boolean; data?: SteamAppDetails }
}

function toStr(v: number | string | undefined | null): string {
  return v == null ? "" : String(v)
}

async function steamFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** 该 Steam 应用是否为视觉小说 / 恋爱模拟类（发现层判定，仅放行明确 VN 类 genre）。 */
export function isVisualNovelApp(details: SteamAppDetails | null | undefined): boolean {
  if (!details) return false
  if ((details.type || "").toLowerCase() !== "game") return false
  const genres = (details.genres ?? []).map((g) => (g.description || "").toLowerCase())
  return genres.some((g) => g === "visual novel" || g === "dating sim")
}

class SteamAdapter implements SourceAdapter {
  readonly key: SourceKey = "STEAM"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    const appid = toStr(externalId).replace(/^steam/i, "").trim()
    if (!/^\d+$/.test(appid)) return null
    const data = await steamFetch<SteamAppResponse>(`${STEAM_STORE}/appdetails?appids=${appid}`)
    const entry = data?.[appid]
    if (!entry || entry.success !== true || !entry.data) return null
    return entry.data
  }

  normalize(payload: unknown): NormalizedWork {
    const d = payload as SteamAppDetails | null
    if (!d) return {}
    const genres = (d.genres ?? []).map((g) => (g.description || "").trim()).filter(Boolean)
    return {
      title: (d.name || "").trim(),
      description: (d.short_description || "").trim(),
      coverImage: (d.header_image || "").trim(),
      releaseDate: (d.release_date?.date || "").trim() || undefined,
      steamAppId: toStr(d.steam_appid),
      tags: genres.map((name) => ({ name })),
    }
  }

  async search(query: string): Promise<{ externalId: string; title: string }[]> {
    const res = await steamFetch<SteamSearchResult>(
      `${STEAM_STORE}/storesearch/?term=${encodeURIComponent(query)}&cc=us&l=en`,
    )
    return (res?.items ?? [])
      .filter((it) => it.id != null)
      .map((it) => ({ externalId: toStr(it.id), title: (it.name || "").trim() || toStr(it.id) }))
  }
}

export const steamAdapter = new SteamAdapter()
export default steamAdapter

/** 发现层：按关键词搜 Steam 商店，返回候选 appid+name（未做 VN 校验，校验在调用方）。 */
export async function searchSteamGames(
  term: string,
  limit = 50,
): Promise<{ appid: string; name: string }[]> {
  const res = await steamFetch<SteamSearchResult>(
    `${STEAM_STORE}/storesearch/?term=${encodeURIComponent(term)}&cc=us&l=en`,
  )
  return (res?.items ?? [])
    .filter((it) => it.id != null)
    .slice(0, limit)
    .map((it) => ({ appid: toStr(it.id), name: (it.name || "").trim() || toStr(it.id) }))
}

/** 发现层：拉取某 appid 的商店详情（供 isVisualNovelApp 校验）。 */
export async function fetchSteamAppDetails(appid: string): Promise<SteamAppDetails | null> {
  const data = await steamFetch<SteamAppResponse>(`${STEAM_STORE}/appdetails?appids=${appid}`)
  const entry = data?.[appid]
  if (!entry || entry.success !== true || !entry.data) return null
  return entry.data
}
