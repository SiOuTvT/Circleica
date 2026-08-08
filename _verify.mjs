import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  const frame = await p.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='AvatarFrame' AND column_name='price'")
  const user = await p.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name='marksSpent'")
  const uaf = await p.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_name='UserAvatarFrame'")
  console.log("AvatarFrame.price:", frame.length ? "OK" : "MISSING")
  console.log("User.marksSpent:", user.length ? "OK" : "MISSING")
  console.log("UserAvatarFrame table:", uaf.length ? "OK" : "MISSING")
  // 确认备份表仍在
  const bak = await p.$queryRawUnsafe("SELECT COUNT(*)::int AS n FROM \"_bak_creators_subsite_leak\"")
  console.log("_bak_creators_subsite_leak preserved:", bak[0].n, "rows")
} catch (e) { console.log("ERR", e.message.slice(0, 200)) } finally { await p.$disconnect() }
