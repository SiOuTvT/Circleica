import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { ValidationError } from "@/lib/errors"
import type { NextRequest } from "next/server"

// VNDB developer type: in=个人同人, ng=同人社团, co=商业公司
const DOUJIN_TYPES = new Set(["in", "ng"])

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()

  const vndbId = req.nextUrl.searchParams.get("id")?.trim()
  if (!vndbId) throw new ValidationError("缺少 VNDB ID")

  // 规范化 ID（支持输入 v123 或 123）
  const id = vndbId.startsWith("v") ? vndbId : `v${vndbId}`

  const res = await fetch("https://api.vndb.org/kana/vn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters: ["id", "=", id],
      fields: [
        "id", "title", "alttitle", "description", "image{url,sexual}",
        "released", "length", "devstatus",
        "developers{id,name,type}",
        "staff{id,name,role}",
        "tags{id,name,rating,category}",
      ].join(","),
    }),
  })

  if (!res.ok) throw new ValidationError("VNDB 请求失败")

  const data = await res.json()
  const vn = data.results?.[0]
  if (!vn) throw new ValidationError(`未找到 ${id}`)

  // 严格判断：必须有至少一个同人开发者
  const developers: { id: string; name: string; type: string }[] = vn.developers ?? []
  const isDoujin = developers.some(d => DOUJIN_TYPES.has(d.type))

  if (!isDoujin) {
    const devNames = developers.map(d => `${d.name}(${d.type})`).join(", ")
    throw new ValidationError(
      `该作品不是同人游戏。开发者：${devNames}。本站只收录同人社团（ng）或个人（in）制作的作品，商业公司（co）作品请勿导入。`,
    )
  }

  // 判断 NSFW（VNDB sexual 字段：0=全年龄, 1=轻度, 2=成人）
  const isNsfw = (vn.image?.sexual ?? 0) >= 2

  // 提取有意义的标签（rating >= 1.5，排除纯技术标签）
  const SKIP_CATEGORIES = new Set(["ero", "tech"])
  const tags: { name: string; vndbId: string }[] = (vn.tags ?? [])
    .filter((t: { rating: number; category: string }) => t.rating >= 1.5 && !SKIP_CATEGORIES.has(t.category))
    .slice(0, 10)
    .map((t: { id: string; name: string }) => ({ name: t.name, vndbId: t.id }))

  // 提取主要 staff（只要核心职位）
  const CORE_ROLES = new Set(["scenario", "art", "chardesign", "director", "music", "songs"])
  const staffMap = new Map<string, { id: string; name: string; roles: string[] }>()
  for (const s of (vn.staff ?? [])) {
    if (!CORE_ROLES.has(s.role)) continue
    if (!staffMap.has(s.id)) staffMap.set(s.id, { id: s.id, name: s.name, roles: [] })
    staffMap.get(s.id)!.roles.push(s.role)
  }
  const staff = [...staffMap.values()]

  // 清理 VNDB BBCode 格式的简介
  const description = (vn.description ?? "")
    .replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/g, "$1")
    .replace(/\[b\](.*?)\[\/b\]/g, "$1")
    .replace(/\[i\](.*?)\[\/i\]/g, "$1")
    .trim()

  return json({
    vndbId:       id,
    title:        vn.alttitle || vn.title,   // 优先用日文标题
    titleEn:      vn.title,
    description,
    coverImage:   vn.image?.url ?? "",
    isNsfw,
    released:     vn.released ?? "",
    developers:   developers.filter(d => DOUJIN_TYPES.has(d.type)).map(d => d.name),
    tags,
    staff,
  })
})
