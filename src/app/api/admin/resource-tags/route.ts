import { getAdminSession } from "@/lib/admin"
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

const DEFAULTS: Record<string, string[]> = {
  platforms: ["Windows", "Android", "iOS", "MacOS", "Linux", "其他"],
  languages: ["简体中文", "繁体中文", "日文", "英文", "韩文", "其他"],
  runTypes: ["电脑硬盘", "手机模拟器", "安卓直装", "苹果直装", "原版镜像", "其他"],
  contentTypes: ["游戏本体", "补丁资源", "番外资源", "游戏存档", "其他"],
}

const LABELS: Record<string, string> = {
  platforms: "运行平台",
  languages: "游戏语言",
  runTypes: "运行方式",
  contentTypes: "资源内容",
}

// GET: 获取所有资源标签选项
export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const keys = Object.values(TAG_KEYS)
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  })
  const map = new Map(settings.map(s => [s.key, s.value]))

  const result = Object.entries(TAG_KEYS).map(([group, key]) => {
    const raw = map.get(key)
    let options: string[] = DEFAULTS[group]
    if (raw) {
      try { options = JSON.parse(raw) } catch { /* use default */ }
    }
    return { group, key, label: LABELS[group], options }
  })

  return NextResponse.json({ tags: result })
}

// PUT: 更新某个标签组的选项
export async function PUT(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const body = await req.json()
  const { group, options } = body as { group: string; options: string[] }

  const key = TAG_KEYS[group as keyof typeof TAG_KEYS]
  if (!key) return NextResponse.json({ error: "无效的标签组" }, { status: 400 })
  if (!Array.isArray(options) || options.length === 0) {
    return NextResponse.json({ error: "选项不能为空" }, { status: 400 })
  }

  // 去重、去空
  const cleaned = [...new Set(options.map(s => s.trim()).filter(Boolean))]

  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(cleaned) },
    create: { key, value: JSON.stringify(cleaned) },
  })

  revalidateTag("resource-tags", "max")
  return NextResponse.json({ success: true, options: cleaned })
}

// POST: 重置为默认值
export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const body = await req.json()
  const { group } = body as { group: string }

  const key = TAG_KEYS[group as keyof typeof TAG_KEYS]
  if (!key) return NextResponse.json({ error: "无效的标签组" }, { status: 400 })

  const defaults = DEFAULTS[group]
  if (!defaults) return NextResponse.json({ error: "无效的标签组" }, { status: 400 })

  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(defaults) },
    create: { key, value: JSON.stringify(defaults) },
  })

  revalidateTag("resource-tags", "max")
  return NextResponse.json({ success: true, options: defaults })
}
