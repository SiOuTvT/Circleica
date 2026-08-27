import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const slug = "一个测试合集";
const GAME_CARD_SELECT = {
  id: true, serialId: true, title: true, coverImage: true, status: true,
  isNsfw: true, favoriteCount: true, viewCount: true, downloadCount: true,
  downloadLinks: true, updatedAt: true, createdAt: true,
  tags: { select: { tag: { select: { name: true, color: true } } } },
  resources: { select: { platform: true, language: true, runType: true, resourceContent: true } },
};
const nsfwWhere = { isNsfw: false };
try {
  const meta = await prisma.curatedCollection.findUnique({ where: { slug, published: true }, select: { name: true, _count: { select: { games: true } } } });
  console.log("META:", JSON.stringify(meta));
  const c = await prisma.curatedCollection.findUnique({
    where: { slug, published: true },
    include: {
      games: { where: { game: { isPublished: true, ...nsfwWhere } }, orderBy: { sortOrder: "asc" }, include: { game: { select: GAME_CARD_SELECT } } },
      _count: { select: { games: true } },
    },
  });
  console.log("QUERY_OK name=", c?.name, "games=", c?.games?.length);
} catch (e) {
  console.log("QUERY_ERR_MESSAGE:", e.message);
  console.log("QUERY_ERR_STACK:", (e.stack || "").split("\n").slice(0, 8).join("\n"));
}
await prisma.$disconnect();
