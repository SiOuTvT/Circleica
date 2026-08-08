import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  const users = await p.$queryRawUnsafe('SELECT id, username, role, "marksSpent" FROM "User" ORDER BY "createdAt" LIMIT 10')
  console.log("users:", JSON.stringify(users))
  const frames = await p.$queryRawUnsafe('SELECT id, name, "price" FROM "AvatarFrame" ORDER BY "sort" LIMIT 20')
  console.log("frames:", JSON.stringify(frames))
  const uaf = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "UserAvatarFrame"')
  console.log("UserAvatarFrame rows:", uaf[0].n)
} catch (e) { console.log("ERR", e.message.slice(0, 200)) } finally { await p.$disconnect() }
