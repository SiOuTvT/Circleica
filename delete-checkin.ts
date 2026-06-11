import { prisma } from "./src/lib/prisma"
; (async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const deleted = await prisma.checkIn.deleteMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
    })
    console.log('Deleted', deleted.count, 'records')
    await prisma.$disconnect()
  } catch (e) {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }
})()