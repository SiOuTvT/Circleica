// tsx 能否加载 Prisma 7 client 的最小验证
import { prisma } from "../src/lib/prisma"
;(async () => {
  try {
    const n = await prisma.user.count()
    console.log('prisma client OK, users=', n)
  } catch (e) {
    console.log('ERR:', (e as Error).message)
  } finally {
    await prisma.$disconnect()
  }
})()
