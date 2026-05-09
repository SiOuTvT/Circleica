import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const previewGames = [
  {
    title: "星之梦",
    description: "Key社经典催泪作品，讲述了一个机器人与少女在末日废墟中的短暂相遇与离别的故事。",
    tags: ["催泪", "治愈"],
    coverImage: "https://t.vndb.org/cover/v/11/11076.jpg",
    vndbId: "11",
  },
  {
    title: "Clannad",
    description: "以家族与爱情为主题的长篇视觉小说，描绘了冈崎朋也与古河渚之间感人至深的人生旅程。",
    tags: ["校园", "恋爱"],
    coverImage: "https://t.vndb.org/cover/v/4/47.jpg",
    vndbId: "4",
  },
  {
    title: "Fate/stay night",
    description: "TYPE-MOON的传奇之作，围绕圣杯战争展开的壮阔奇幻冒险，拥有多个令人难忘的故事线。",
    tags: ["奇幻", "战斗"],
    coverImage: "https://t.vndb.org/cover/v/11/114.jpg",
    vndbId: "114",
  },
  {
    title: "Rewrite",
    description: "Key社又一力作，以「Rewrite」为主题，讲述了少年在超自然力量与日常之间的抉择。",
    tags: ["催泪", "校园"],
    coverImage: "https://t.vndb.org/cover/v/7/7751.jpg",
    vndbId: "7751",
  },
  {
    title: "Little Busters!",
    description: "以友情与青春为主题的群像剧，直枝理树与Little Busters的伙伴们共同经历的欢笑与泪水。",
    tags: ["日常", "友情"],
    coverImage: "https://t.vndb.org/cover/v/5/5580.jpg",
    vndbId: "5580",
  },
  {
    title: "Angel Beats!",
    description: "死后世界的少年少女们组成SSS战团反抗命运的感人故事，融合了战斗、喜剧与催泪元素。",
    tags: ["催泪", "奇幻"],
    coverImage: "https://t.vndb.org/cover/v/16/16849.jpg",
    vndbId: "16849",
  },
  {
    title: "Kanon",
    description: "Key社催泪三部曲之一，月宫亚由与相的祐一在雪之小镇重逢的冬日恋爱物语。",
    tags: ["恋爱", "催泪"],
    coverImage: "https://t.vndb.org/cover/v/33/337.jpg",
    vndbId: "337",
  },
  {
    title: "Air",
    description: "Key社催泪三部曲之二，国崎往人与神尾观铃之间跨越千年的翼人传说。",
    tags: ["治愈", "奇幻"],
    coverImage: "https://t.vndb.org/cover/v/6/67.jpg",
    vndbId: "67",
  },
]

async function main() {
  console.log("开始创建预览游戏种子数据...")

  // 先确保标签存在
  const allTags = [...new Set(previewGames.flatMap((g) => g.tags))]
  for (const tagName of allTags) {
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName, color: "#FF8FAB" },
    })
  }
  console.log(`已确保存在 ${allTags.length} 个标签`)

  // 创建游戏
  for (const game of previewGames) {
    // 检查是否已存在同名游戏
    const existing = await prisma.game.findFirst({ where: { title: game.title } })
    if (existing) {
      console.log(`跳过已存在的游戏: ${game.title}`)
      continue
    }

    const created = await prisma.game.create({
      data: {
        title: game.title,
        description: game.description,
        coverImage: game.coverImage,
        vndbId: game.vndbId,
        status: "完结",
        isNsfw: false,
        isPublished: true,
        tags: {
          create: await Promise.all(
            game.tags.map(async (tagName) => {
              const tag = await prisma.tag.findUnique({ where: { name: tagName } })
              return { tagId: tag!.id }
            })
          ),
        },
      },
    })
    console.log(`已创建游戏: ${created.title} (${created.id})`)
  }

  console.log("预览游戏种子数据创建完成！")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })