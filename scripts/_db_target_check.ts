import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()
async function main() {
  const cnt = await p.work.count()
  const bySource = await p.workSource.groupBy({ by: ['source'], _count: { _all: true } })
  console.log('WORK_COUNT =', cnt)
  console.log('BY_SOURCE =', JSON.stringify(bySource))
  await p.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
