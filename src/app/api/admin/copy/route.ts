import { getAdminSession } from "@/lib/admin"
import { COPY_ENTRIES, type CopyKey } from "@/lib/copy"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

// GET: 获取所有文案（默认值 + 覆盖值）
export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const keys = COPY_ENTRIES.map(e => `copy:${e.key}`)
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  })
  const overrides = new Map(settings.map(s => [s.key.replace("copy:", ""), s.value]))

  const entries = COPY_ENTRIES.map(entry => ({
    key: entry.key,
    label: entry.label,
    category: entry.category,
    default: entry.default,
    value: overrides.get(entry.key) || "",
    isOverridden: overrides.has(entry.key) && overrides.get(entry.key) !== "",
  }))

  return NextResponse.json({ entries })
}

// PUT: 批量更新文案覆盖
export async function PUT(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  const updates = body.updates as Array<{ key: string; value: string }> | undefined

  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 })
  }

  const validKeys = new Set(COPY_ENTRIES.map(e => e.key))

  for (const { key, value } of updates) {
    if (!validKeys.has(key as CopyKey)) continue
    const dbKey = `copy:${key}`

    if (!value || value.trim() === "") {
      // 空值 = 恢复默认，删除覆盖
      await prisma.siteSetting.deleteMany({ where: { key: dbKey } })
    } else {
      await prisma.siteSetting.upsert({
        where: { key: dbKey },
        update: { value: value.trim() },
        create: { key: dbKey, value: value.trim() },
      })
    }
  }

  revalidateTag("copy", "max")
  return NextResponse.json({ success: true })
}

// DELETE: 重置所有文案为默认值
export async function DELETE() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const keys = COPY_ENTRIES.map(e => `copy:${e.key}`)
  await prisma.siteSetting.deleteMany({
    where: { key: { in: keys } },
  })

  revalidateTag("copy", "max")
  return NextResponse.json({ success: true })
}
