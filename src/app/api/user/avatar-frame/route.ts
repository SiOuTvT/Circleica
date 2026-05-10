import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const VALID_FRAMES = ["none", "slime", "sakura", "starlight", "aurora", "flame"]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { frame } = await req.json()

  if (!VALID_FRAMES.includes(frame)) {
    return NextResponse.json({ error: "无效的头像框" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarFrame: frame },
  })

  return NextResponse.json({ ok: true, frame })
}