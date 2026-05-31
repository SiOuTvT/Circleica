import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/* ─── GET: 获取游戏的所有资源 ─── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params

    const resources = await prisma.gameResource.findMany({
      where: { gameId },
      include: {
        entries: true,
        user: { select: { id: true, username: true, avatar: true, composedAvatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // 统计每个用户的已发布资源数量
    const userIds = [...new Set(resources.map(r => r.userId))]
    const userResourceCounts = await prisma.gameResource.groupBy({
      by: ["userId"],
      where: { gameId },
      _count: { id: true },
    })
    const countMap = new Map(userResourceCounts.map(c => [c.userId, c._count.id]))

    const formatted = resources.map(r => ({
      id: r.id,
      resourceName: r.resourceName,
      resourceNote: r.resourceNote,
      platform: JSON.parse(r.platform) as string[],
      language: JSON.parse(r.language) as string[],
      runType: JSON.parse(r.runType) as string[],
      resourceContent: JSON.parse(r.resourceContent) as string[],
      createdAt: r.createdAt.toISOString(),
      userId: r.userId,
      username: r.user.username,
      userAvatar: r.user.composedAvatarUrl || r.user.avatar,
      userResourceCount: countMap.get(r.userId) || 0,
      entries: r.entries.map(e => ({
        id: e.id,
        url: e.url,
        extractCode: e.extractCode,
        decompressCode: e.decompressCode,
        fileSize: e.fileSize,
      })),
    }))

    return NextResponse.json({ resources: formatted })
  } catch (error) {
    console.error("[Resources GET]", error)
    return NextResponse.json({ error: "获取资源失败" }, { status: 500 })
  }
}

/* ─── POST: 创建新资源 ─── */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { id: gameId } = await params
    const body = await req.json()

    // 验证游戏存在
    const game = await prisma.game.findUnique({ where: { id: gameId } })
    if (!game) {
      return NextResponse.json({ error: "游戏不存在" }, { status: 404 })
    }

    // 验证必填字段
    const { entries, platform, language, runType, resourceContent, resourceName, resourceNote } = body

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "至少需要一个下载链接" }, { status: 400 })
    }
    for (const entry of entries) {
      if (!entry.url?.trim()) {
        return NextResponse.json({ error: "下载地址不能为空" }, { status: 400 })
      }
    }
    if (!Array.isArray(platform) || platform.length === 0) {
      return NextResponse.json({ error: "请选择平台" }, { status: 400 })
    }
    if (!Array.isArray(language) || language.length === 0) {
      return NextResponse.json({ error: "请选择语言" }, { status: 400 })
    }
    if (!Array.isArray(runType) || runType.length === 0) {
      return NextResponse.json({ error: "请选择运行方式" }, { status: 400 })
    }
    if (!Array.isArray(resourceContent) || resourceContent.length === 0) {
      return NextResponse.json({ error: "请选择资源内容" }, { status: 400 })
    }

    // 创建资源
    const resource = await prisma.gameResource.create({
      data: {
        gameId,
        userId: session.user.id,
        resourceName: resourceName?.trim() || "",
        resourceNote: resourceNote?.trim() || "",
        platform: JSON.stringify(platform),
        language: JSON.stringify(language),
        runType: JSON.stringify(runType),
        resourceContent: JSON.stringify(resourceContent),
        entries: {
          create: entries.map((e: { url: string; extractCode?: string; decompressCode?: string; fileSize?: string }) => ({
            url: e.url.trim(),
            extractCode: e.extractCode?.trim() || "",
            decompressCode: e.decompressCode?.trim() || "",
            fileSize: e.fileSize?.trim() || "",
          })),
        },
      },
      include: { entries: true, user: { select: { id: true, username: true, avatar: true, composedAvatarUrl: true } } },
    })

    return NextResponse.json({
      resource: {
        id: resource.id,
        resourceName: resource.resourceName,
        resourceNote: resource.resourceNote,
        platform: JSON.parse(resource.platform),
        language: JSON.parse(resource.language),
        runType: JSON.parse(resource.runType),
        resourceContent: JSON.parse(resource.resourceContent),
        createdAt: resource.createdAt.toISOString(),
        userId: resource.userId,
        username: resource.user.username,
        userAvatar: resource.user.composedAvatarUrl || resource.user.avatar,
        entries: resource.entries.map(e => ({
          id: e.id,
          url: e.url,
          extractCode: e.extractCode,
          decompressCode: e.decompressCode,
          fileSize: e.fileSize,
        })),
      },
    })
  } catch (error) {
    console.error("[Resources POST]", error)
    return NextResponse.json({ error: "提交资源失败" }, { status: 500 })
  }
}