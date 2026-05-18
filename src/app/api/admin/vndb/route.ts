import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const VNDB_API = "https://api.vndb.org/kana"

/* ── 清理 VNDB BBCode 标记，只保留纯文本 ── */
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
    .replace(/\[[^\]]*?\]/g, "")  // 兜底：清除任何剩余标签
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/* ── POST /api/admin/vndb ── */
export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }

  const { vndbId } = await req.json()
  if (!vndbId?.trim()) {
    return NextResponse.json({ error: "请输入 VNDB 编号" }, { status: 400 })
  }

  // 标准化 VNDB ID：纯数字自动加 "v" 前缀
  const vnId = /^\d+$/.test(vndbId.trim()) ? `v${vndbId.trim()}` : vndbId.trim()

  try {
    // 调用 VNDB Kana API
    const vnRes = await fetch(`${VNDB_API}/vn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: ["id", "=", vnId],
        fields: "title, alttitle, aliases, description, released, tags.name, developers.name",
        results: 1,
      }),
    })

    if (!vnRes.ok) {
      const errText = await vnRes.text()
      return NextResponse.json(
        { error: `VNDB API 请求失败 (${vnRes.status}): ${errText}` },
        { status: 502 }
      )
    }

    const vnData = await vnRes.json()
    if (!vnData.results?.length) {
      return NextResponse.json({ error: "未找到对应的 VNDB 游戏" }, { status: 404 })
    }

    const vn = vnData.results[0]

    /* ── 格子一：主推名称 ── */
    // 优先中文名 → alttitle（可能是中文） → 日文名 → 英文名(title)
    // title 通常是日文或英文原名；alttitle 是替代标题（可能含中文）
    // aliases 是字符串数组
    const aliases: string[] = vn.aliases ?? []

    // 从 aliases 中寻找中文名
    const chineseRegex = /[\u4e00-\u9fff]/
    const chineseAlias = aliases.find((a: string) => chineseRegex.test(a))
    const altTitle = vn.alttitle ?? ""

    // 主推名称：优先中文 alias → alttitle 中文 → alttitle → vn.title
    let primaryName = ""
    if (chineseAlias) {
      primaryName = chineseAlias
    } else if (altTitle && chineseRegex.test(altTitle)) {
      primaryName = altTitle
    } else if (altTitle) {
      primaryName = altTitle
    } else {
      primaryName = vn.title ?? ""
    }

    /* ── 格子二：日文官方原名 ── */
    // alttitle 可能是日文，title 可能是日文
    // 如果 alttitle 是日文则用 alttitle，否则尝试从 title 中提取
    const jpRegex = /[\u3040-\u309f\u30a0-\u30ff]/
    let japaneseName = ""
    if (altTitle && jpRegex.test(altTitle)) {
      japaneseName = altTitle
    } else if (jpRegex.test(vn.title ?? "")) {
      japaneseName = vn.title
    } else {
      // 从 aliases 找日文名
      const jpAlias = aliases.find((a: string) => jpRegex.test(a))
      if (jpAlias) japaneseName = jpAlias
    }

    /* ── 格子三：英文官方名称 ── */
    // title 可能是英文，如果不是则从 aliases 找纯英文
    const enRegex = /^[a-zA-Z0-9\s\-'":!.,&()]+$/
    let englishName = ""
    if (enRegex.test(vn.title ?? "")) {
      englishName = vn.title
    } else {
      const enAlias = aliases.find((a: string) => enRegex.test(a.trim()))
      if (enAlias) englishName = enAlias
    }

    /* ── 格子四：搜索别名库 ── */
    // 排除已用于主名、日文名、英文名的别名
    const usedNames = new Set(
      [primaryName, japaneseName, englishName].filter(Boolean).map(n => n.trim())
    )
    const extraAliases = aliases
      .filter((a: string) => !usedNames.has(a.trim()))
      .join(", ")

    /* ── 发售日期 ── */
    const released = vn.released ?? null // ISO date string e.g. "2023-04-28"

    /* ── 简介 ── */
    const rawDesc = vn.description ?? ""
    const cleanDesc = stripVndbMarkup(rawDesc)

    /* ── 标签 ── */
    const vnTags: { name: string }[] = vn.tags ?? []
    const tagNames = vnTags.map((t: { name: string }) => t.name).filter(Boolean)

    // 查询已有标签，找出缺失的
    const existingTags = await prisma.tag.findMany({
      where: { name: { in: tagNames } },
      select: { id: true, name: true },
    })
    const existingNameSet = new Set(existingTags.map(t => t.name))

    // 自动创建缺失标签
    const newTagNames = tagNames.filter(n => !existingNameSet.has(n))
    const newTags: { id: string; name: string }[] = []
    for (const name of newTagNames) {
      try {
        const created = await prisma.tag.create({
          data: { name, color: "#6b7280" }, // 默认灰色
          select: { id: true, name: true },
        })
        newTags.push(created)
      } catch {
        // 可能并发导致重复，忽略
      }
    }

    // 所有匹配的标签 ID 列表
    const allTagIds = [...existingTags, ...newTags].map(t => t.id)

    /* ── 开发商 ── */
    const devs: { name: string }[] = vn.developers ?? []
    const studioName = devs.length > 0 ? devs.map((d) => d.name).join(", ") : ""

    return NextResponse.json({
      title: primaryName,
      japaneseName,
      englishName,
      aliases: extraAliases,
      releaseDate: released,
      description: cleanDesc,
      studioName,
      tagIds: allTagIds,
      // 也返回标签名称用于前端显示（标签可能刚创建，前端列表还没刷新）
      tagNames: [...existingTags, ...newTags].map(t => ({ id: t.id, name: t.name })),
    })
  } catch (err) {
    console.error("VNDB fetch error:", err)
    return NextResponse.json(
      { error: `VNDB 数据拉取失败: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}