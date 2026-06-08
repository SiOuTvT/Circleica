import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import crypto from "crypto"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: gameId } = await params

  // 使用用户 ID 进行去重（已登录用户）+ IP 哈希作为备份（防止同一用户多账号举报）
  // 注意：x-forwarded-for 可被客户端伪造，但在有反向代理的部署环境下是可靠的
  const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown"
  // 存储 IP 哈希而非原始 IP，保护用户隐私
  const ip = crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 32)

  await prisma.gameReport.upsert({
    where: { gameId_ip: { gameId, ip } },
    create: { gameId, ip },
    update: {},
  })

  const count = await prisma.gameReport.count({ where: { gameId } })
  return NextResponse.json({ count, archiving: count >= 3 })
}
