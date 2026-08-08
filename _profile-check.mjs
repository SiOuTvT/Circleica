import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  const users = await p.$queryRawUnsafe('SELECT "serialId", username, avatar, "composedAvatarUrl", "avatarFrameId", banner FROM "User" ORDER BY "serialId" LIMIT 5')
  console.log("users:", JSON.stringify(users, null, 1))
  const frames = await p.$queryRawUnsafe('SELECT id, name, "imageUrl", price FROM "AvatarFrame" ORDER BY sort LIMIT 10')
  console.log("frames:", JSON.stringify(frames, null, 1))
} catch (e) { console.log("ERR", e.message.slice(0, 300)) } finally { await p.$disconnect() }
