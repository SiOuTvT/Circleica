import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  // 用户 1 的收藏（游戏封面）
  const favs = await p.$queryRawUnsafe('SELECT g.id, g.title, g."coverImage", g."serialId" FROM "Favorite" f JOIN "Game" g ON f."gameId" = g.id WHERE f."userId" = $1 ORDER BY f."createdAt" DESC LIMIT 8', "cmrzh7w7q0000tl4g2cxnqtjs")
  console.log("favorites:", JSON.stringify(favs))
  // 用户 1 的关注
  const following = await p.$queryRawUnsafe('SELECT u.id, u.username, u.avatar FROM "Follow" f JOIN "User" u ON f."followingId" = u.id WHERE f."followerId" = $1 LIMIT 5', "cmrzh7w7q0000tl4g2cxnqtjs")
  console.log("following:", JSON.stringify(following))
  // 用户 1 的粉丝
  const followers = await p.$queryRawUnsafe('SELECT u.id, u.username, u.avatar FROM "Follow" f JOIN "User" u ON f."followerId" = u.id WHERE f."followingId" = $1 LIMIT 5', "cmrzh7w7q0000tl4g2cxnqtjs")
  console.log("followers:", JSON.stringify(followers))
  // 用户 1 的评论
  const comments = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "Comment" WHERE "userId" = $1', "cmrzh7w7q0000tl4g2cxnqtjs")
  console.log("comment count:", JSON.stringify(comments))
  // 私聊（若存在）
  const convos = await p.$queryRawUnsafe('SELECT c.id, c."participantId", c."initiatorId" FROM "Conversation" c WHERE c."initiatorId" = $1 OR c."participantId" = $1 LIMIT 5', "cmrzh7w7q0000tl4g2cxnqtjs")
  console.log("conversations:", JSON.stringify(convos))
} catch (e) { console.log("ERR", e.message.slice(0, 300)) } finally { await p.$disconnect() }
