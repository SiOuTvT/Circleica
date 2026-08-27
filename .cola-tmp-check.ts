import "dotenv/config"
import { prisma } from "./src/lib/prisma"

async function main() {
  console.log("DATABASE_URL set:", !!process.env.DATABASE_URL, process.env.DATABASE_URL?.slice(0, 30))
  const q = "Beyond"
  const where = {
    isPublished: true,
    OR: [
      { searchVector: { search: q } },
      { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } },
    ],
  }
  try {
    const [games, total] = await Promise.all([
      prisma.game.findMany({ where, take: 5, select: { id: true, serialId: true, title: true } }),
      prisma.game.count({ where }),
    ])
    console.log("PROXY-RESULT: games=", games.length, "total=", total)
    console.log(JSON.stringify(games.map((g) => g.title)))
  } catch (e) {
    console.error("PROXY-ERROR:", (e as Error).message)
  }
}
main()
