// TEMP read-only: locate "sexual"/"violence" occurrences inside VNDB raw
import { readFileSync } from "node:fs"
import { PrismaClient } from "@prisma/client"
const envText = readFileSync(new URL("../.env", import.meta.url), "utf8")
const m = /^DATABASE_URL\s*=\s*"([^"]+)"|^DATABASE_URL\s*=\s*'([^']+)'|^DATABASE_URL\s*=\s*(\S+)/m.exec(envText)
process.env.DATABASE_URL = m[1] || m[2] || m[3]
const prisma = new PrismaClient()
const out = {}
try {
  const rows = await prisma.workSource.findMany({
    where: { source: "VNDB" },
    select: { externalId: true, raw: true },
    take: 5,
  })
  out.occurrences = rows.map((s) => {
    const raw = s.raw
    const json = JSON.stringify(raw)
    const findOcc = (kw) => {
      const res = []
      let idx = -1
      while ((idx = json.toLowerCase().indexOf(kw, idx + 1)) !== -1) {
        res.push(json.slice(Math.max(0, idx - 60), idx + 60))
        if (res.length >= 3) break
      }
      return res
    }
    return { externalId: s.externalId, sexual: findOcc("sexual"), violence: findOcc("violence") }
  })
} catch (e) {
  out.error = String(e)
} finally {
  await prisma.$disconnect()
}
console.log(JSON.stringify(out, null, 2))
