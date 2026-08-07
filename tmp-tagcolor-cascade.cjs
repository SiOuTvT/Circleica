const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const KEY = 'galvelica:tagColor'
  const NEW = '#34C3AE'
  const existing = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  const oldColor = existing && existing.value ? existing.value : '(none)'
  console.log('current unified tag color:', JSON.stringify(oldColor))

  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: NEW },
    update: { value: NEW },
  })

  const res = await prisma.tag.updateMany({
    where: { source: 'galvelica' },
    data: { color: NEW },
  })
  const total = await prisma.tag.count({ where: { source: 'galvelica' } })
  console.log('unified set to', NEW, '| galvelica tags updated:', res.count, '| total galvelica tags:', total)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('CASCADE_FAILED:', e && e.message ? e.message : e)
    await prisma.$disconnect()
    process.exit(1)
  })
