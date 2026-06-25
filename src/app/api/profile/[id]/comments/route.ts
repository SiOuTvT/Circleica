import { ok, serverError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const comments = await prisma.comment.findMany({
      where: { userId: id, parentId: null },
      select: {
        id: true,
        content: true,
        createdAt: true,
        game: {
          select: { id: true, serialId: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return ok({ comments })
  } catch (error) {
    console.error("[Profile Comments API]", error)
    return serverError("获取评论失败")
  }
}
