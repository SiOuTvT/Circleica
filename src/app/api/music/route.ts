import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

const getCachedMusic = unstable_cache(
  () => prisma.music.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, title: true, url: true,
      playlist: { select: { id: true, name: true } },
    },
  }),
  ["active-music"],
  { revalidate: 300, tags: ["music"] },
)

export const GET = withHandler(async () => {
  const music = await getCachedMusic()

  // Group into playlists
  const grouped: Record<string, { id: string; name: string; tracks: typeof music }> = {}
  for (const m of music) {
    const key = m.playlist?.id ?? "_ungrouped"
    if (!grouped[key]) {
      grouped[key] = { id: key, name: m.playlist?.name ?? "未分类", tracks: [] }
    }
    grouped[key].tracks.push(m)
  }

  return json(Object.values(grouped))
})
