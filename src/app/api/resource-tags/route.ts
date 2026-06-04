import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const DEFAULTS: Record<string, string[]> = {
  resource_platforms: ["Windows", "Android", "iOS", "MacOS", "Linux", "其他"],
  resource_languages: ["简体中文", "繁体中文", "日文", "英文", "韩文", "其他"],
  resource_run_types: ["电脑硬盘", "手机模拟器", "安卓直装", "苹果直装", "原版镜像", "其他"],
  resource_content_types: ["游戏本体", "补丁资源", "番外资源", "游戏存档", "其他"],
}

// GET: 获取所有资源标签选项（公开接口，无缓存，管理员修改后立即生效）
export async function GET() {
  const keys = Object.keys(DEFAULTS)
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  })
  const map = new Map(settings.map(s => [s.key, s.value]))

  const result: Record<string, string[]> = {}
  for (const key of keys) {
    const raw = map.get(key)
    if (raw) {
      try { result[key] = JSON.parse(raw) } catch { result[key] = DEFAULTS[key] }
    } else {
      result[key] = DEFAULTS[key]
    }
  }

  return NextResponse.json(result)
}
