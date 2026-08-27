import { readFileSync } from "node:fs"
const envText = readFileSync(".env", "utf8")
for (const line of envText.split("\n")) {
  const m = line.match(/^DATABASE_URL=(.*)$/)
  if (m) process.env.DATABASE_URL = m[1].trim().replace(/^"|"$/g, "")
}
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { GAME_CARD_SELECT } from "@/lib/game-card-map"

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })
  const slug = "一个测试合集"
  const nsfwWhere = { isNsfw: false }
  try {
    const c = await prisma.curatedCollection.findUnique({
      where: { slug, published: true },
      include: {
        games: { where: { game: { isPublished: true, ...nsfwWhere } }, orderBy: { sortOrder: "asc" }, include: { game: { select: GAME_CARD_SELECT } } },
        _count: { select: { games: true } },
      },
    })
    console.log("OK name=", c?.name, "games=", c?.games?.length)
  } catch (e: any) {
    console.log("PRISMA_ERR:", e.message)
    console.log((e.stack || "").split("\n").slice(0, 12).join("\n"))
  }
  await prisma.$disconnect()
}
main()
