import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const key = "galvelica:tagColor"
const existing = await p.siteSetting.findUnique({ where: { key } })
console.log("BEFORE:", existing?.value ?? "(unset -> default)")
await p.siteSetting.upsert({
  where: { key },
  update: { value: "#123456" },
  create: { key, value: "#123456" },
})
console.log("AFTER SET: #123456")
await p.$disconnect()
