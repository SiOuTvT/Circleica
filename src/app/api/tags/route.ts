import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

const getCachedTags = unstable_cache(
  () => prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, groupId: true, sortOrder: true, isVisible: true },
  }),
  ["all-tags"],
  { revalidate: 300, tags: ["tags"] },
)

export const GET = withHandler(async () => {
  const tags = await getCachedTags()
  return json(tags)
})
