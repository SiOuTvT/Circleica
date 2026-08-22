import { PrismaClient } from "./src/generated/prisma/client"

const p = new PrismaClient()
async function main() {
  const totalCircleica = await p.tag.count({ where: { source: "circleica" } })
  const withPublishedGame = await p.tag.count({
    where: { source: "circleica", games: { some: { game: { isPublished: true } } } },
  })
  const galvelicaTags = await p.tag.count({ where: { source: "galvelica" } })
  const gamesPublished = await p.game.count({ where: { isPublished: true } })
  const gameTagRows = await p.gameTag.count()
  console.log(JSON.stringify({ totalCircleica, withPublishedGame, galvelicaTags, gamesPublished, gameTagRows }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
