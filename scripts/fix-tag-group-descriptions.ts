import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const updates = [
    { name: '首页卡片标签', description: '游戏制作风格标签，如：纯爱、拔作、剧情作、萌作' },
    { name: '详情页信息栏标签', description: '详情页信息栏和游戏编辑器共用标签，如：题材、分级、游戏类型' },
    { name: '个人中心标签', description: '个人中心和收藏页标签，如：游玩状态、收藏分类' },
    { name: '发现页标签', description: '发现页标签云和排行榜标签，如：热门题材、风格分类' },
  ]

  for (const u of updates) {
    const result = await prisma.tagGroup.updateMany({
      where: { name: u.name },
      data: { description: u.description },
    })
    console.log(`✅ ${u.name}: ${result.count} rows updated`)
  }

  // 验证结果
  const groups = await prisma.tagGroup.findMany({
    select: { name: true, description: true },
    orderBy: { name: 'asc' },
  })
  console.log('\n当前标签组描述:')
  for (const g of groups) {
    console.log(`  ${g.name}: ${g.description || '(空)'}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())