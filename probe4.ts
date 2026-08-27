import { realPrisma } from "@/lib/prisma"
import { GAME_CARD_SELECT } from "@/lib/game-card-map"

async function main() {
  const slug = "一个测试合集"
  try {
    const c = await realPrisma.curatedCollection.findUnique({
      where: { slug, published: true },
      include: {
        games: { where: { game: { isPublished: true, isNsfw: false } }, orderBy: { sortOrder: "asc" }, include: { game: { select: GAME_CARD_SELECT } } },
        _count: { select: { games: true } },
      },
    })
    console.log("OK name=", c?.name, "games=", c?.games?.length)
  } catch (e: any) {
    console.log("RAW_ERR:", e.message)
    console.log((e.stack || "").split("\n").slice(0, 10).join("\n"))
  }
}
main()
