import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"

/**
 * 创作者轻量聚合（制作组图鉴 · 创作者 Tab）
 *
 * 按 Circleica 自有 Game.creators 聚合出创作者列表：
 * 头像 / 姓名 / 角色集合 / 作品数 / 代表封面。
 * 复用现有 Creator 实体，v1 不做人物百科（详情页仍为 /creators/[id]）。
 */
export const GET = withHandler(async (req) => {
  const searchParams = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = 24
  const search = searchParams.get("search")?.trim().toLowerCase() || ""
  const role = searchParams.get("role") || ""

  const games = await prisma.game.findMany({
    where: { isPublished: true },
    select: {
      coverImage: true,
      favoriteCount: true,
      creators: {
        select: {
          role: true,
          creator: {
            select: { id: true, vndbId: true, name: true, nameJa: true, avatar: true },
          },
        },
      },
    },
  })

  interface Acc {
    id: string
    name: string
    nameJa: string | null
    avatar: string | null
    count: number
    cover: string | null
    maxFav: number
    roles: Set<string>
  }
  const map = new Map<string, Acc>()
  for (const g of games) {
    for (const c of g.creators) {
      const cid = c.creator.vndbId ? `s${c.creator.vndbId}` : c.creator.id
      if (!cid) continue
      const e = map.get(cid)
      if (e) {
        e.count++
        if (c.role) e.roles.add(c.role)
        if (g.favoriteCount > e.maxFav && g.coverImage) {
          e.maxFav = g.favoriteCount
          e.cover = g.coverImage
        }
      } else {
        map.set(cid, {
          id: cid,
          name: c.creator.name,
          nameJa: c.creator.nameJa || null,
          avatar: c.creator.avatar || null,
          count: 1,
          cover: g.coverImage || null,
          maxFav: g.favoriteCount,
          roles: new Set(c.role ? [c.role] : []),
        })
      }
    }
  }

  let creators = Array.from(map.values()).map((e) => ({
    id: e.id,
    name: e.name,
    nameJa: e.nameJa,
    avatar: e.avatar,
    gameCount: e.count,
    coverImage: e.cover,
    roles: Array.from(e.roles),
  }))

  if (search) {
    creators = creators.filter(
      (c) => (c.name || "").toLowerCase().includes(search) || (c.nameJa || "").toLowerCase().includes(search),
    )
  }
  if (role && role !== "all") {
    creators = creators.filter((c) => c.roles.includes(role))
  }

  creators.sort((a, b) => b.gameCount - a.gameCount)

  const total = creators.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * limit
  const paged = creators.slice(start, start + limit)

  return json({ creators: paged, total, totalPages: totalPages, page: safePage })
})
