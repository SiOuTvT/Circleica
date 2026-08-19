import { prisma } from "../src/lib/prisma"
;(async () => {
  const g = await prisma.game.findFirst({ select: { id: true, title: true, publisherId: true } })
  console.log('game publisherId:', JSON.stringify(g))
  const notif = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { type: true, userId: true, targetType: true, targetId: true, createdAt: true } })
  console.log('latest notifications:', JSON.stringify(notif, null, 2))
  // 看 demo_user 印记
  const d = await prisma.user.findFirst({ where: { username: 'demo_user' }, select: { id: true, username: true, marks: true, marksSpent: true } })
  console.log('demo_user:', JSON.stringify(d))
  const a = await prisma.user.findFirst({ where: { username: 'diagtester' }, select: { id: true, username: true, marks: true, marksSpent: true } })
  console.log('diagtester:', JSON.stringify(a))
  await prisma.$disconnect()
})()
