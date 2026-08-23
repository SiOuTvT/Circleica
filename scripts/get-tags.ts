import { prisma } from "@/lib/prisma";

async function main() {
  const tags = await prisma.tag.findMany({
    where: { source: "circleica", slug: { not: null as any } },
    select: { name: true, slug: true, color: true },
    take: 10
  });
  console.log(JSON.stringify(tags, null, 2));
  await prisma.$disconnect();
}

main();