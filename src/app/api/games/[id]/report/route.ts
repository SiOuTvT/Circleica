import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import crypto from "crypto"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: gameId } = await params

  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === "string" ? body.reason : ""

  const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown"
  const ip = crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 32)

  await prisma.gameReport.upsert({
    where: { gameId_ip: { gameId, ip } },
    create: { gameId, ip, reason },
    update: { reason },
  })

  const count = await prisma.gameReport.count({ where: { gameId } })
  return NextResponse.json({ count, archiving: count >= 3 })
}
