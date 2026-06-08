import { getAdminSession } from "@/lib/admin"
import { ensureResourceTags } from "@/lib/preset-resource-tags"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

// 资源标签的 SiteSetting key 定义
export const TAG_KEYS = {
  platforms: "resource_platforms",
  languages: "resource_languages",
  runTypes: "resource_run_types",
  contentTypes: "resource_content_types",
} as const

const LABELS: Record<string, string> = {
  platforms: "运行平台",
  languages: "游戏语言",
  runTypes: "运行方式",
  contentTypes: "资源内容",
}

// GET: 获取所有资源标签选项
export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  // 确保资源标签数据存在
  await ensureResourceTags()

  const keys = Object.values(TAG_KEYS)
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  })
  const map = new Map(settings.map(s => [s.key, s.value]))

  const result = Object.entries(TAG_KEYS).map(([group, key]) => {
    const raw = map.get(key)
    let options: string[] = []
    if (raw) {
      try { options = JSON.parse(raw) } catch { /* ignore */ }
    }
    return { group, key, label: LABELS[group], options }
  })

  return NextResponse.json({ tags: result })
}

// PUT: 更新某个标签组的选项
export async function PUT(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  const group = body.group as string | undefined
  const options = body.options as string[] | undefined

  const key = TAG_KEYS[group as keyof typeof TAG_KEYS]
  if (!key) return NextResponse.json({ error: "无效的标签组" }, { status: 400 })
  if (!Array.isArray(options)) return NextResponse.json({ error: "选项格式错误" }, { status: 400 })

  // 去重、去空
  const cleaned = [...new Set(options.map(s => s.trim()).filter(Boolean))]

  // 获取旧选项，找出被删除的标签
  const oldSetting = await prisma.siteSetting.findUnique({ where: { key } })
  let oldOptions: string[] = []
  if (oldSetting?.value) {
    try { oldOptions = JSON.parse(oldSetting.value) } catch { /* ignore */ }
  }
  const removedTags = oldOptions.filter(t => !cleaned.includes(t))

  // 更新 SiteSetting
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(cleaned) },
    create: { key, value: JSON.stringify(cleaned) },
  })

  // 清理已删除的标签：从所有 GameResource 的对应字段中移除
  if (removedTags.length > 0) {
    const removedSet = new Set(removedTags)

    // 使用 Prisma findMany + update 替代原始 SQL
    const allResources = await prisma.gameResource.findMany({
      select: { id: true, platform: true, language: true, runType: true, resourceContent: true },
    })

    for (const resource of allResources) {
      let fieldToUpdate: string | null = null
      let filtered: string[] = []

      // 检查每个字段是否包含被删除的标签
      const fields: Array<{ key: string; value: string; field: "platform" | "language" | "runType" | "resourceContent" }> = [
        { key: "resource_platforms", value: resource.platform, field: "platform" },
        { key: "resource_languages", value: resource.language, field: "language" },
        { key: "resource_run_types", value: resource.runType, field: "runType" },
        { key: "resource_content_types", value: resource.resourceContent, field: "resourceContent" },
      ]

      // 只处理当前修改的标签组对应的字段
      const targetField = fields.find(f => f.key === key)
      if (targetField) {
        const tags: string[] = JSON.parse(targetField.value || "[]")
        filtered = tags.filter(t => !removedSet.has(t))
        if (filtered.length !== tags.length) {
          fieldToUpdate = targetField.field
        }
      }

      if (fieldToUpdate) {
        await prisma.gameResource.update({
          where: { id: resource.id },
          data: { [fieldToUpdate]: JSON.stringify(filtered) },
        })
      }
    }
  }

  revalidateTag("resource-tags", "max")
  return NextResponse.json({ success: true, options: cleaned, removed: removedTags })
}
