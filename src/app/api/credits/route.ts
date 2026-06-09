import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit
  const role = searchParams.get("role") || ""
  const search = searchParams.get("search")?.trim() || ""

  // 构建查询条件
  const where: Record<string, unknown> = { isPublished: true }

  // 搜索条件
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { creators: { some: { creator: { name: { contains: search, mode: "insensitive" } } } } },
    ]
  }

  // 角色筛选
  if (role && role !== "all") {
    where.creators = { some: { role } }
  }

  // 查询有创作者的游戏
  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        serialId: true,
        title: true,
        coverImage: true,
        createdAt: true,
        creators: {
          select: {
            role: true,
            creator: {
              select: {
                id: true,
                name: true,
                nameJa: true,
                avatar: true,
              },
            },
          },
        },
      },
    }),
    prisma.game.count({ where }),
  ])

  // 格式化数据
  const formatted = games
    .filter(g => g.creators.length > 0) // 只返回有创作者的游戏
    .map(g => ({
      id: g.id,
      serialId: g.serialId,
      title: g.title,
      coverImage: g.coverImage,
      createdAt: g.createdAt.toISOString(),
      creators: g.creators.map(c => ({
        id: c.creator.id,
        name: c.creator.name,
        nameJa: c.creator.nameJa,
        avatar: c.creator.avatar,
        role: c.role,
      })),
    }))

  return NextResponse.json({
    games: formatted,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}
