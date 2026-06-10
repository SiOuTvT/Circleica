import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { username: true, avatar: true },
  })
  console.log("Admin:", JSON.stringify(admin))

  const anns = await prisma.announcement.findMany({
    select: { id: true, authorName: true, authorAvatar: true },
  })
  console.log("Anns before:", JSON.stringify(anns, null, 2))

  // Backfill empty authorName/authorAvatar with admin info
  const result = await prisma.announcement.updateMany({
    where: { authorName: "" },
    data: {
      authorName: admin?.username ?? "管理员",
      authorAvatar: admin?.avatar ?? "",
    },
  })
  console.log(`Updated ${result.count} announcements`)

  const annsAfter = await prisma.announcement.findMany({
    select: { id: true, authorName: true, authorAvatar: true },
  })
  console.log("Anns after:", JSON.stringify(annsAfter, null, 2))
}

main().then(() => prisma.$disconnect())