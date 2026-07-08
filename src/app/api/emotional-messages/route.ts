import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { ensureEmotionalMessages } from "@/lib/ensure-emotional-messages"

export const GET = withHandler(async (req) => {
  await ensureEmotionalMessages()
  const category = req.nextUrl.searchParams.get("category")
  const key = req.nextUrl.searchParams.get("key")

  if (key) {
    const item = await prisma.emotionalMessage.findFirst({ where: { key, enabled: true } })
    return json(item)
  }

  const where: Record<string, unknown> = { enabled: true }
  if (category) where.category = category

  const items = await prisma.emotionalMessage.findMany({
    where,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  })
  return json(items)
})
