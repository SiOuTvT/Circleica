/**
 * VndbAdapter — Galvelica 数据源适配器之 VNDB 实现（Stage B）
 *
 * 把原有 /api/admin/vndb 的「拉取 + 名称解析 + 标签清洗 + 创作者提取」逻辑
 * 收敛进统一的 SourceAdapter 契约。传输层复用 src/lib/vndb.ts 的 VNDBClient
 * （代理 / IPv4 / 重试 / 熔断器 / 缓存均由其负责），本适配器只做归一化。
 *
 * 归一化结果遵循 ADR §5 字段级融合优先级表的「VNDB 视角」：
 * 作品名 / 原名 / 英文 / 别名 / 简介 / 发售日 / 社团 / 标签 / 创作者 全部由 VNDB 提供。
 */
import { vndbClient } from "@/lib/vndb"
import { cleanTags } from "@/lib/vndb-tags"
import type { NormalizedWork, SourceAdapter, SourceKey } from "./types"

/** 标准化 VNDB ID：纯数字自动加 "v" 前缀 */
function normalizeVndbId(raw: string): string {
  const id = raw.trim()
  return /^\d+$/.test(id) ? `v${id}` : id
}

/** 清理 VNDB BBCode 标记，只保留纯文本 */
function stripVndbMarkup(raw: string): string {
  if (!raw) return ""
  return raw
    .replace(/\[url=[^\]]*\]/gi, "")
    .replace(/\[\/url\]/gi, "")
    .replace(/\[spoiler\]/gi, "")
    .replace(/\[\/spoiler\]/gi, "")
    .replace(/\[b\]/gi, "")
    .replace(/\[\/b\]/gi, "")
    .replace(/\[i\]/gi, "")
    .replace(/\[\/i\]/gi, "")
    .replace(/\[u\]/gi, "")
    .replace(/\[\/u\]/gi, "")
    .replace(/\[s\]/gi, "")
    .replace(/\[\/s\]/gi, "")
    .replace(/\[code\]/gi, "")
    .replace(/\[\/code\]/gi, "")
    .replace(/\[quote\]/gi, "")
    .replace(/\[\/quote\]/gi, "")
    .replace(/\[raw\]/gi, "")
    .replace(/\[\/raw\]/gi, "")
    .replace(/\[color=[^\]]*\]/gi, "")
    .replace(/\[\/color\]/gi, "")
    .replace(/\[size=[^\]]*\]/gi, "")
    .replace(/\[\/size\]/gi, "")
    .replace(/\[sup\]/gi, "")
    .replace(/\[\/sup\]/gi, "")
    .replace(/\[sub\]/gi, "")
    .replace(/\[\/sub\]/gi, "")
    .replace(/\[url\]/gi, "")
    .replace(/\[spoiler=[^\]]*\]/gi, "")
    .replace(/\[[^\]]*?\]/g, "") // 兜底：清除任何剩余标签
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

class VndbAdapter implements SourceAdapter {
  readonly key: SourceKey = "VNDB"

  /**
   * 按外部 ID 拉取原始 payload。
   * 返回 VNDB Kana API 的完整响应（含 results 数组）；无结果 / 出错时返回 null。
   * 调用方（适配器 normalize / 融合引擎）负责读取 results[0]。
   */
  async fetchByExternalId(externalId: string): Promise<unknown | null> {
    const vnId = normalizeVndbId(externalId)
    return vndbClient.fetchVisualNovelRaw(vnId)
  }

  /** 把 VNDB 原始 payload 归一为源无关结构 */
  normalize(payload: unknown): NormalizedWork {
    const data = payload as { results?: Array<Record<string, unknown>> } | null
    const vn = data?.results?.[0]
    if (!vn) return {}

    const aliases = (vn.aliases as string[] | undefined) ?? []

    /* ── 主推名称：优先中文 alias → alttitle 中文 → alttitle → title ── */
    const chineseRegex = /[一-鿿]/
    const chineseAlias = aliases.find((a) => chineseRegex.test(a))
    const altTitle = (vn.alttitle as string | undefined) ?? ""

    let primaryName = ""
    if (chineseAlias) primaryName = chineseAlias
    else if (altTitle && chineseRegex.test(altTitle)) primaryName = altTitle
    else if (altTitle) primaryName = altTitle
    else primaryName = (vn.title as string | undefined) ?? ""

    /* ── 日文官方原名 ── */
    const jpRegex = /[぀-ゟ゠-ヿ]/
    let japaneseName = ""
    if (altTitle && jpRegex.test(altTitle)) japaneseName = altTitle
    else if (jpRegex.test((vn.title as string | undefined) ?? "")) japaneseName = vn.title as string
    else {
      const jpAlias = aliases.find((a) => jpRegex.test(a))
      if (jpAlias) japaneseName = jpAlias
    }

    /* ── 英文官方名称 ── */
    const enRegex = /^[a-zA-Z0-9\s\-'":!.,&()]+$/
    let englishName = ""
    if (enRegex.test((vn.title as string | undefined) ?? "")) englishName = vn.title as string
    else {
      const enAlias = aliases.find((a) => enRegex.test(a.trim()))
      if (enAlias) englishName = enAlias
    }

    /* ── 搜索别名库（已排除主推 / 原名 / 英文） ── */
    const usedNames = new Set(
      [primaryName, japaneseName, englishName].filter(Boolean).map((n) => n.trim()),
    )
    const extraAliases = aliases.filter((a) => !usedNames.has(a.trim()))

    /* ── 发售日期 ── */
    const released = (vn.released as string | undefined) ?? null

    /* ── 简介（去 BBCode） ── */
    const cleanDesc = stripVndbMarkup((vn.description as string | undefined) ?? "")

    /* ── 封面（VNDB 主视觉图 URL；image.url 返回字符串，旧路径可能返回 {url} 对象，兼容两种） ── */
    const rawImage = vn.image as string | { url?: string } | undefined
    const coverImage = typeof rawImage === "string" ? rawImage : rawImage?.url ?? undefined

    /* ── 标签（智能清洗：黑名单 + 翻译 + 去重） ── */
    const vnTags = (vn.tags as Array<{ name: string; rating?: number }> | undefined) ?? []
    const tagNames = cleanTags(
      vnTags.map((t) => ({ name: t.name, rating: t.rating ?? 0.5 })),
    )

    /* ── 开发商 ── */
    const devs = (vn.developers as Array<{ name: string }> | undefined) ?? []
    const studioName = devs.length > 0 ? devs.map((d) => d.name).join(", ") : ""

    /* ── 创作者（staff：脚本、原画、音乐等） ── */
    const staffList = (vn.staff as Array<{ id: string; name: string; original?: string; role: string }> | undefined) ?? []
    const creators = staffList
      .filter((s) => s.id && s.name)
      .map((s) => ({
        name: s.name,
        role: s.role || "other",
        sourceId: String(s.id).replace("s", ""),
        nameJa: s.original || "",
      }))
      .slice(0, 20)

    return {
      title: primaryName,
      originalWork: japaneseName,
      englishName,
      aliases: extraAliases,
      description: cleanDesc,
      coverImage,
      releaseDate: released ?? undefined,
      studioName,
      tags: tagNames.map((name) => ({ name })),
      creators,
    }
  }

  /** 按标题搜索（用户给了作品名但无 ID 的场景） */
  async search(query: string): Promise<{ externalId: string; title: string }[]> {
    try {
      const res = await vndbClient.searchVisualNovels(query, 10)
      return (res.results || []).map((r) => ({
        externalId: r.id,
        title: r.title ?? "",
      }))
    } catch {
      return []
    }
  }
}

export const vndbAdapter = new VndbAdapter()
export default vndbAdapter
