import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const out = {}
try {
  out.bySource = await prisma.tag.groupBy({ by: ["source"], _count: true })
  out.groups = await prisma.tagGroup.findMany({
    where: { id: { in: ["preset_detail_header", "preset_discover", "preset_home_card", "preset_resource_tab"] } },
    select: { id: true, name: true, _count: { select: { tags: true } } },
  })
  out.tagsInTargetGroups = await prisma.tag.findMany({
    where: { groupId: { in: ["preset_detail_header", "preset_discover"] } },
    select: { id: true, name: true, source: true, groupId: true, _count: { select: { games: true, works: true } } },
  })
  out.galvelicaWithGroupId = await prisma.tag.findMany({
    where: { source: "galvelica", NOT: { groupId: null } },
    select: { id: true, name: true, source: true, groupId: true },
  })
  out.circTotal = await prisma.tag.count({ where: { source: "circleica" } })
  out.circWithPubGame = await prisma.tag.count({ where: { source: "circleica", games: { some: { game: { isPublished: true } } } } })
  out.circWithAnyGame = await prisma.tag.count({ where: { source: "circleica", games: { some: {} } } })
  out.publishedGames = await prisma.game.count({ where: { isPublished: true } })
  out.allGalTags = await prisma.tag.findMany({ where: { source: "galvelica" }, select: { id: true, name: true, groupId: true, _count: { select: { works: true, games: true } } }, take: 50 })
} catch (e) {
  out.error = String(e)
} finally {
  await prisma.$disconnect()
}
console.log(JSON.stringify(out, null, 2))
