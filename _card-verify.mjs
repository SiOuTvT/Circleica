import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  const favs = await p.$queryRawUnsafe('SELECT g."serialId", g.title, g."coverImage", g."isNsfw" FROM "Favorite" f JOIN "Game" g ON f."gameId" = g.id WHERE f."userId" = (SELECT id FROM "User" WHERE "serialId" = 1) ORDER BY f."createdAt" DESC LIMIT 12')
  console.log("user1 favorites:", JSON.stringify(favs))
  const games = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "Game"')
  console.log("total games:", games[0].n)
} catch (e) { console.log("ERR", e.message.slice(0, 200)) } finally { await p.$disconnect() }
