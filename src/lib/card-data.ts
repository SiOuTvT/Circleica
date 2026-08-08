/**
 * 名片数据查询（服务端复用）
 * 供用户主页「生成名片」与公开分享页 /card/[uid] 共用。
 * 数据红线：展示封面（take 8）与全部收藏统计严格分离。
 */
import { prisma } from "@/lib/prisma"

export interface CardFavoriteGame {
  id: string
  title: string
  coverImage: string | null
  serialId: number
  isNsfw: boolean
}
export interface CardFavoriteTag { name: string; color: string; count: number }
export interface CardFavoriteStudio { displayName: string; count: number }
export interface CardFavoriteYear { year: number; count: number }
export interface CardFavoritePlatform { platform: string; count: number }
export interface CardCollection {
  id: string; name: string; description: string | null
  covers: Array<string | null>; count: number
}
export interface CardAchievement { id: string; name: string; icon: string | null; category: string }

export interface CardData {
  username: string
  uid: string
  serialId: number
  avatar: string | null
  composedAvatarUrl: string | null
  banner: string | null
  bio: string
  role: string
  createdAt: string
  avatarFrameUrl: string
  favoriteGames: CardFavoriteGame[]
  favoriteTotal: number
  favoriteTags: CardFavoriteTag[]
  favoriteStudios: CardFavoriteStudio[]
  favoriteYears: CardFavoriteYear[]
  favoritePlatforms: CardFavoritePlatform[]
  checkinHeat: number[]
  marksTotal: number
  collections: CardCollection[]
  achievements: CardAchievement[]
}

/**
 * 查询一个用户的全部名片数据。
 * 供服务端组件（用户主页 / 分享页）复用。
 */
export async function getCardData(userId: string): Promise<CardData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, serialId: true, uid: true, username: true, avatar: true,
      composedAvatarUrl: true, banner: true, bio: true, role: true,
      createdAt: true, marksSpent: true,
      avatarFrame: { select: { imageUrl: true } },
    },
  })
  if (!user) return null

  const base: CardData = {
    username: user.username,
    uid: user.uid ?? String(user.serialId),
    serialId: user.serialId,
    avatar: user.avatar,
    composedAvatarUrl: user.composedAvatarUrl,
    banner: user.banner,
    bio: user.bio || "",
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    avatarFrameUrl: user.avatarFrame?.imageUrl ?? "",
    favoriteGames: [],
    favoriteTotal: 0,
    favoriteTags: [],
    favoriteStudios: [],
    favoriteYears: [],
    favoritePlatforms: [],
    checkinHeat: [],
    marksTotal: 0,
    collections: [],
    achievements: [],
  }

  // ── 展示封面（仅渲染样本，take 8） ──
  const favoriteGames = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { game: { select: { id: true, title: true, coverImage: true, serialId: true, isNsfw: true } } },
  })
  base.favoriteGames = favoriteGames.map((f) => f.game)

  // ── 全部收藏（统计用，无 take） ──
  const allFavs = await prisma.favorite.findMany({ where: { userId }, select: { gameId: true } })
  base.favoriteTotal = allFavs.length
  const ids = allFavs.map((f) => f.gameId)

  if (ids.length > 0) {
    // Tag
    const gameTags = await prisma.gameTag.findMany({
      where: { gameId: { in: ids } },
      select: { tag: { select: { name: true, color: true } } },
    })
    const tagCount = new Map<string, { name: string; color: string; count: number }>()
    for (const { tag } of gameTags) {
      const cur = tagCount.get(tag.name)
      if (cur) cur.count++
      else tagCount.set(tag.name, { name: tag.name, color: tag.color, count: 1 })
    }
    base.favoriteTags = Array.from(tagCount.values()).sort((a, b) => b.count - a.count).slice(0, 5)

    // Studio
    const studios = await prisma.gameStudio.findMany({
      where: { gameId: { in: ids } },
      select: { studio: { select: { displayName: true } } },
    })
    const studioCount = new Map<string, number>()
    for (const { studio } of studios) {
      studioCount.set(studio.displayName, (studioCount.get(studio.displayName) ?? 0) + 1)
    }
    base.favoriteStudios = Array.from(studioCount.entries())
      .map(([displayName, count]) => ({ displayName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // 年份 + 平台
    const favMeta = await prisma.favorite.findMany({
      where: { userId },
      select: { game: { select: { releaseDate: true, platforms: true } } },
    })
    const yearCount = new Map<number, number>()
    for (const f of favMeta) {
      if (!f.game.releaseDate) continue
      const y = f.game.releaseDate.getFullYear()
      if (y > 1970 && y <= new Date().getFullYear() + 1) {
        yearCount.set(y, (yearCount.get(y) ?? 0) + 1)
      }
    }
    base.favoriteYears = Array.from(yearCount.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year)

    const platformCount = new Map<string, number>()
    for (const f of favMeta) {
      const plats = Array.isArray(f.game.platforms) ? f.game.platforms as string[] : []
      for (const p of plats) platformCount.set(p, (platformCount.get(p) ?? 0) + 1)
    }
    base.favoritePlatforms = Array.from(platformCount.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }

  // ── 签到热力条（最近 30 自然日） ──
  try {
    const checkins = await prisma.checkIn.findMany({ where: { userId }, select: { date: true, marks: true } })
    const byDate = new Map<string, number>()
    for (const c of checkins) {
      const d = c.date instanceof Date ? c.date.toISOString().slice(0, 10) : String(c.date)
      byDate.set(d, c.marks)
    }
    const today = new Date()
    const heat: number[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400_000)
      heat.push(byDate.get(d.toISOString().slice(0, 10)) ?? 0)
    }
    base.checkinHeat = heat
    const { _sum } = await prisma.checkIn.aggregate({ where: { userId }, _sum: { marks: true } })
    base.marksTotal = (_sum.marks ?? 0) - (user.marksSpent ?? 0)
  } catch { /* 签到查询失败不阻断 */ }

  // ── 收藏夹（≤3） ──
  try {
    const collections = await prisma.collection.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true, name: true, description: true,
        favorites: { take: 3, orderBy: { createdAt: "desc" }, select: { game: { select: { coverImage: true } } } },
        _count: { select: { favorites: true } },
      },
    })
    base.collections = collections.map((c) => ({
      id: c.id, name: c.name, description: c.description,
      covers: c.favorites.map((f) => f.game.coverImage),
      count: c._count.favorites,
    }))
  } catch { /* 收藏夹查询失败不阻断 */ }

  // ── 成就（≤6） ──
  try {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
      take: 6,
      select: { achievement: { select: { id: true, name: true, icon: true, category: true, hidden: true } } },
    })
    base.achievements = achievements
      .filter((a) => !a.achievement.hidden)
      .map((a) => ({
        id: a.achievement.id, name: a.achievement.name,
        icon: a.achievement.icon, category: a.achievement.category,
      }))
  } catch { /* 成就查询失败不阻断 */ }

  return base
}

/** 供卡片渲染用的外部图代理（与客户端 proxyImg 一致） */
export function serverProxyImg(src: string): string {
  if (!src) return src
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/api/img-proxy")) return src
  try {
    const u = new URL(src)
    if (u.origin === "https://localhost:3001" || u.hostname === "localhost") return src
    return `/api/img-proxy?url=${encodeURIComponent(src)}`
  } catch {
    return src
  }
}
