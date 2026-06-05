import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export interface SearchResult {
  type: "game" | "user" | "tag" | "forum"
  id: string
  title: string
  subtitle?: string
}

export async function GET(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q) return NextResponse.json([])

  const contains = { contains: q }

  const [games, users, tags, posts] = await Promise.all([
    prisma.game.findMany({
      where: { title: contains },
      select: { id: true, title: true, isPublished: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { username: contains },
          { email: contains },
        ],
      },
      select: { id: true, username: true, email: true, role: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { name: contains },
      select: { id: true, name: true, color: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.forumPost.findMany({
      where: { title: contains },
      select: { id: true, title: true, user: { select: { username: true } } },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ])

  const results: SearchResult[] = [
    ...games.map(g => ({
      type: "game" as const,
      id: g.id,
      title: g.title,
      subtitle: g.isPublished ? "已发布" : "未发布",
    })),
    ...users.map(u => ({
      type: "user" as const,
      id: u.id,
      title: u.username,
      subtitle: `${u.email} · ${u.role}`,
    })),
    ...tags.map(t => ({
      type: "tag" as const,
      id: t.id,
      title: t.name,
      subtitle: t.color,
    })),
    ...posts.map(p => ({
      type: "forum" as const,
      id: p.id,
      title: p.title,
      subtitle: p.user.username,
    })),
  ]

  return NextResponse.json(results)
}
