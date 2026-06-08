import { getAdminSession } from "@/lib/admin"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { prisma } from "@/lib/prisma"
import { isValidPosition } from "@/lib/tag-positions"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  // 确保预设标签组存在（首次访问时自动创建）
  await ensurePresetTagGroups()

  // 获取资源标签计数（用于预设组显示）
  const allResourceTagKeys = ["resource_platforms", "resource_languages", "resource_run_types", "resource_content_types"]
  const homeCardTagKeys = ["resource_languages", "resource_run_types", "resource_content_types"]

  const allResourceSettings = await prisma.siteSetting.findMany({
    where: { key: { in: allResourceTagKeys } },
  })

  let totalResourceTagCount = 0
  let homeCardTagCount = 0
  for (const s of allResourceSettings) {
    try {
      const arr = JSON.parse(s.value)
      if (!Array.isArray(arr)) continue
      totalResourceTagCount += arr.length
      if (homeCardTagKeys.includes(s.key)) homeCardTagCount += arr.length
    } catch {}
  }

  const totalTagCount = await prisma.tag.count()

  const groups = await prisma.tagGroup.findMany({
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    include: {
      tags: {
        orderBy: { name: "asc" },
        include: { _count: { select: { games: true } } },
      },
    },
  })

  return NextResponse.json(groups.map((g) => ({
    ...g,
    positions: JSON.parse(g.positions) as string[],
    tags: g.tags.map((t) => ({ ...t, gameCount: t._count.games })),
    // 预设组显示资源标签数，自定义组显示实际标签数
    tagCount: g.id === "preset_home_card"
      ? homeCardTagCount
      : g.id === "preset_resource_tab"
        ? totalResourceTagCount
        : g.isPreset ? totalTagCount : g.tags.length,
  })))
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let name: string | undefined, description: string | undefined, color: string | undefined, positions: string[] | undefined
  try {
    const body = await req.json()
    name = body.name as string | undefined
    description = body.description as string | undefined
    color = body.color as string | undefined
    positions = body.positions as string[] | undefined
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  if (!name?.trim()) return NextResponse.json({ error: "标签组名不能为空" }, { status: 400 })

  const exists = await prisma.tagGroup.findUnique({ where: { name: name.trim() } })
  if (exists) return NextResponse.json({ error: "标签组已存在" }, { status: 409 })

  // Validate positions
  const validPositions = Array.isArray(positions)
    ? positions.filter((p: string) => isValidPosition(p))
    : []

  const group = await prisma.tagGroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? "",
      color: color ?? "#7c8a9e",
      positions: JSON.stringify(validPositions),
    },
  })
  return NextResponse.json({ ...group, positions: validPositions }, { status: 201 })
}
