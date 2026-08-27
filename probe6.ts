import { prisma } from "@/lib/prisma"
import { GAME_CARD_SELECT } from "@/lib/game-card-map"

async function main() {
  const slug = "一个测试合集"
  try {
    const c = await prisma.curatedCollection.findUnique({
      where: { slug, published: true },
      include: {
        games: { where: { game: { isPublished: true, isNsfw: false } }, orderBy: { sortOrder: "asc" }, include: { game: { select: GAME_CARD_SELECT } } },
        _count: { select: { games: true } },
      },
    })
    console.log("PROXY_RESULT:", c ? c.name : "NULL", "games:", c?.games?.length)
  } catch (e: any) {
    console.log("PROXY_THREW:", e.message)
  }
}
main()
