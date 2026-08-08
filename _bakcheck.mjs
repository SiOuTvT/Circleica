import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  for (const t of ["_bak_creators_subsite_leak", "_bak_tags_subsite_leak"]) {
    try {
      const n = await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${t}"`)
      console.log(`${t}: ${n[0].n} rows`)
    } catch { console.log(`${t}: table missing`) }
  }
  const workIdx = await p.$queryRawUnsafe("SELECT indexname FROM pg_indexes WHERE tablename='Work' AND indexname='Work_isCommercial_idx'")
  console.log("Work_isCommercial_idx:", workIdx.length > 0 ? "exists" : "missing")
  // schema.prisma 里 Collection 是否有 slug？对比信息
  const slugCol = await p.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='Collection' ORDER BY ordinal_position")
  console.log("Collection columns:", JSON.stringify(slugCol.map((c) => c.column_name)))
} catch (e) { console.log("ERR", e.message.slice(0, 300)) } finally { await p.$disconnect() }
