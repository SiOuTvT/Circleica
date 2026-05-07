/**
 * 种子脚本：添加示例创作者到数据库
 * 运行方式: npx tsx prisma/seed-creators.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 示例创作者数据（来自知名同人游戏）
const sampleCreators = [
  {
    name: "ZUN",
    nameJa: "太田順也",
    bio: "东方Project系列创作者，上海爱丽丝幻乐团代表",
    avatar: "",
    vndbId: undefined,
    twitterUrl: "https://twitter.com/korindou",
    wikipediaUrl: "https://zh.wikipedia.org/wiki/ZUN",
  },
  {
    name: "型月",
    nameJa: "TYPE-MOON",
    bio: "日本同人社团，代表作月姬、Fate/stay night",
    avatar: "",
    vndbId: undefined,
    twitterUrl: "",
    wikipediaUrl: "https://zh.wikipedia.org/wiki/TYPE-MOON",
  },
  {
    name: "武内崇",
    nameJa: "たけうちたかし",
    bio: "TYPE-MOON 创始人之一，著名画师",
    avatar: "",
    vndbId: undefined,
    twitterUrl: "",
    wikipediaUrl: "",
  },
  {
    name: "奈须蘑菇",
    nameJa: "きのこ",
    bio: "TYPE-MOON 创始人之一，著名脚本家",
    avatar: "",
    vndbId: undefined,
    twitterUrl: "",
    wikipediaUrl: "",
  },
  {
    name: "龙骑士07",
    nameJa: "竜騎士07",
    bio: "07th Expansion 代表，海猫鸣泣之时作者",
    avatar: "",
    vndbId: undefined,
    twitterUrl: "",
    wikipediaUrl: "",
  },
]

async function main() {
  console.log('开始添加示例创作者...')
  
  let created = 0
  let skipped = 0
  
  for (const creator of sampleCreators) {
    // 检查是否已存在
    const existing = await prisma.creator.findFirst({
      where: { name: creator.name },
    })
    
    if (existing) {
      console.log(`跳过: ${creator.name} (已存在)`)
      skipped++
      continue
    }
    
    await prisma.creator.create({
      data: creator,
    })
    
    console.log(`✓ 创建: ${creator.name}`)
    created++
  }
  
  console.log(`\n完成！创建了 ${created} 个创作者，跳过了 ${skipped} 个`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
