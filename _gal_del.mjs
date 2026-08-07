import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const key = "galvelica:tagColor"
const existing = await p.siteSetting.findUnique({ where: { key } })
console.log("BEFORE DELETE:", existing?.value ?? "(unset)")
await p.siteSetting.deleteMany({ where: { key } })
console.log("AFTER DELETE: restored default")
await p.$disconnect()
