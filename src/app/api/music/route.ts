import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"

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
  { revalidate: 300, tags: ["music"] }
)

export async function GET() {
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

  return NextResponse.json(Object.values(grouped))
}
