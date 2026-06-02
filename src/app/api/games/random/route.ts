import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const nsfw = req.nextUrl.searchParams.get("nsfw") === "1"
  const nsfwClause = nsfw ? Prisma.sql`` : Prisma.sql`AND "isNsfw" = false`

  // 使用 PostgreSQL RANDOM() 在数据库层随机选择，避免 O(n) skip 扫描
  const [game] = await prisma.$queryRaw<{ id: string; serialId: number }[]>(
    Prisma.sql`SELECT id, "serialId" FROM "Game" WHERE "isPublished" = true ${nsfwClause} ORDER BY RANDOM() LIMIT 1`
  )

  if (!game) return NextResponse.json({ error: "暂无游戏" }, { status: 404 })
  return NextResponse.json({ id: game.id, serialId: game.serialId })
}
