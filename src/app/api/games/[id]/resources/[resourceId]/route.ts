import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/* ─── PUT: 编辑资源（仅本人或管理员） ─── */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { id: gameId, resourceId } = await params

    const existing = await prisma.gameResource.findUnique({
      where: { id: resourceId },
      select: { userId: true, gameId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 })
    }
    if (existing.gameId !== gameId) {
      return NextResponse.json({ error: "资源不属于该游戏" }, { status: 400 })
    }

    // 权限：本人或管理员
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (existing.userId !== session.user.id && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "无权编辑" }, { status: 403 })
    }

    const body = await req.json()
    const { entries, platform, language, runType, resourceContent, resourceName, resourceNote } = body

    // 验证必填
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

    // 更新：先删旧entries，再建新的（事务）
    const resource = await prisma.$transaction(async (tx) => {
      await tx.gameResourceEntry.deleteMany({ where: { resourceId } })
      return tx.gameResource.update({
        where: { id: resourceId },
        data: {
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
        include: {
          entries: true,
          user: { select: { id: true, username: true, avatar: true, composedAvatarUrl: true } },
        },
      })
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
    logger.db.error("[Resource PUT]", error)
    return NextResponse.json({ error: "编辑资源失败" }, { status: 500 })
  }
}

/* ─── DELETE: 删除资源（仅本人或管理员） ─── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { id: gameId, resourceId } = await params

    const existing = await prisma.gameResource.findUnique({
      where: { id: resourceId },
      select: { userId: true, gameId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 })
    }
    if (existing.gameId !== gameId) {
      return NextResponse.json({ error: "资源不属于该游戏" }, { status: 400 })
    }

    // 权限：本人或管理员
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (existing.userId !== session.user.id && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "无权删除" }, { status: 403 })
    }

    // 级联删除 entries 由数据库外键约束处理（onDelete: Cascade）
    await prisma.gameResource.delete({ where: { id: resourceId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.db.error("[Resource DELETE]", error)
    return NextResponse.json({ error: "删除资源失败" }, { status: 500 })
  }
}