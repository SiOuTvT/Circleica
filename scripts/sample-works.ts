/** 抽样：确认 qualitySignal 格式、tag/creator 结构、字段填充率（为优先级设计提供依据） */
import { prisma } from "../src/lib/prisma"

async function main() {
  const works = await prisma.work.findMany({
    take: 3,
    orderBy: { qualityScore: "desc" },
    select: {
      title: true,
      rating: true,
      ratingAvg: true,
      ratingCount: true,
      favoriteCount: true,
      viewCount: true,
      qualityScore: true,
      qualitySignal: true,
      studioName: true,
      releaseDate: true,
      tags: { select: { tag: { select: { name: true, group: { select: { name: true } } } } }, take: 6 },
      creators: { select: { role: true, creator: { select: { name: true } } }, take: 6 },
    },
  })
  console.log("=== 高分成品样例 ===")
  console.log(JSON.stringify(works, null, 2).slice(0, 2200))

  // 填充率
  const total = await prisma.work.count()
  const withRating = await prisma.work.count({ where: { rating: { not: null } } })
  const withRatingAvg = await prisma.work.count({ where: { ratingAvg: { not: null } } })
  const withQs = await prisma.work.count({ where: { qualityScore: { gt: 0 } } })
  const withFav = await prisma.work.count({ where: { favoriteCount: { gt: 0 } } })
  const withStudio = await prisma.work.count({ where: { NOT: { studioName: "" } } })
  const withTags = await prisma.work.count({ where: { tags: { some: {} } } })
  const withCreators = await prisma.work.count({ where: { creators: { some: {} } } })
  console.log("=== 填充率 ===")
  console.log({
    total,
    "rating(%)": ((withRating / total) * 100).toFixed(1),
    "ratingAvg(%)": ((withRatingAvg / total) * 100).toFixed(1),
    "qualityScore>0(%)": ((withQs / total) * 100).toFixed(1),
    "favoriteCount>0(%)": ((withFav / total) * 100).toFixed(1),
    "studioName(%)": ((withStudio / total) * 100).toFixed(1),
    "有tags(%)": ((withTags / total) * 100).toFixed(1),
    "有creators(%)": ((withCreators / total) * 100).toFixed(1),
  })
}

main()
  .catch((e) => console.error("失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
