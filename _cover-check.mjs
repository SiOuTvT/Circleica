import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  // 游戏封面 URL 样例（看来源与格式）
  const games = await p.$queryRawUnsafe('SELECT "serialId", title, "coverImage" FROM "Game" WHERE "coverImage" != \'\' LIMIT 8')
  console.log("covers:", JSON.stringify(games, null, 1))
  // 截图数据
  const screens = await p.$queryRawUnsafe('SELECT "serialId", title, screenshots FROM "Game" WHERE screenshots::text != \'[]\' AND screenshots::text != \'null\' LIMIT 3')
  console.log("screenshots:", JSON.stringify(screens))
  // 成就数量
  const ach = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "Achievement"')
  console.log("achievements:", JSON.stringify(ach))
  // 头像框
  const frames = await p.$queryRawUnsafe('SELECT id, name, "imageUrl", price, "isPublic" FROM "AvatarFrame" LIMIT 5')
  console.log("frames:", JSON.stringify(frames))
  // SiteSetting 主题
  const settings = await p.$queryRawUnsafe('SELECT key FROM "SiteSetting" LIMIT 20')
  console.log("siteSettings keys:", JSON.stringify(settings))
} catch (e) { console.log("ERR", e.message.slice(0, 300)) } finally { await p.$disconnect() }
