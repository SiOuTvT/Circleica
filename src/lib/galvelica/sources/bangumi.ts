/**
 * BangumiAdapter — Galvelica 数据源适配器之 Bangumi 实现（Stage D）
 *
 * 与 VndbAdapter 同契约：fetchByExternalId 拉原始 payload，normalize 转源无关结构。
 * Bangumi 公开 API（api.bgm.tv/v0）多数端点需 Bearer 令牌；本项目从环境变量
 * BANGUMI_ACCESS_TOKEN 读取。未配置令牌时，本适配器的方法**优雅降级**（返回 null / 空数组），
 * 不会抛错，融合引擎仍可仅凭 VNDB 正常工作。配置令牌后即自动接入多源融合。
 *
 * 字段覆盖：标题 / 原名 / 简介 / 封面 / 发售日 / 标签。社团与 Staff 主要由 VNDB 提供，
 * Bangumi 在此仅作补充（ADR §5 优先级表）。
 */
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

const BANGUMI_BASE = "https://api.bgm.tv/v0"
const BANGUMI_TOKEN = process.env.BANGUMI_ACCESS_TOKEN || ""

interface BgmSubject {
  id: number
  name: string
  name_cn?: string
  summary?: string
  date?: string
  images?: { large?: string; common?: string; medium?: string; small?: string; grid?: string }
  tags?: { name: string; count: number }[]
}

interface BgmSearchResult {
  data?: BgmSubject[]
  total?: number
}

function tokenReady(): boolean {
  return BANGUMI_TOKEN.trim().length > 0
}

async function bgmFetch<T>(path: string): Promise<T | null> {
  if (!tokenReady()) return null
  try {
    const res = await fetch(`${BANGUMI_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${BANGUMI_TOKEN}`,
        Accept: "application/json",
      },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function pickCover(images?: BgmSubject["images"]): string {
  if (!images) return ""
  return images.common || images.large || images.medium || images.grid || images.small || ""
}

class BangumiAdapter implements SourceAdapter {
  readonly key: SourceKey = "BANGUMI"

  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    const id = externalId.replace(/^bgm/i, "").trim()
    if (!/^\d+$/.test(id)) return null
    const [subject, tagsRes] = await Promise.all([
      bgmFetch<BgmSubject>(`/subjects/${id}`),
      bgmFetch<{ data?: { name: string; count: number }[] }>(`/subjects/${id}/tags`),
    ])
    if (!subject) return null
    const tags = tagsRes?.data?.map((t) => ({ name: t.name })) ?? []
    return { subject, tags }
  }

  normalize(payload: unknown): NormalizedWork {
    const p = payload as { subject?: BgmSubject; tags?: { name: string; count: number }[] } | null
    const subject = p?.subject
    if (!subject) return {}

    const cn = subject.name_cn?.trim()
    const original = subject.name?.trim() || ""
    const title = cn && cn !== original ? cn : original || cn || ""

    const tagNames = (p?.tags ?? subject.tags ?? [])
      .map((t) => (typeof t === "string" ? t : t.name))
      .filter((n): n is string => typeof n === "string" && n.trim().length > 0)

    return {
      title,
      originalWork: cn ? original : "",
      description: subject.summary?.trim() || "",
      coverImage: pickCover(subject.images),
      releaseDate: subject.date?.trim() || undefined,
      tags: tagNames.map((name) => ({ name })),
    }
  }

  async search(query: string): Promise<{ externalId: string; title: string }[]> {
    if (!tokenReady()) return []
    const res = await bgmFetch<BgmSearchResult>(
      `/subjects/search?keyword=${encodeURIComponent(query)}&type=4&limit=10`,
    )
    if (!res?.data?.length) return []
    return res.data.map((s) => ({
      externalId: String(s.id),
      title: s.name_cn?.trim() || s.name?.trim() || String(s.id),
    }))
  }
}

export const bangumiAdapter = new BangumiAdapter()
export default bangumiAdapter
