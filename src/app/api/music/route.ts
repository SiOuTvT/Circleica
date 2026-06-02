import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"

const getCachedMusic = unstable_cache(
  () => prisma.music.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, url: true },
  }),
  ["active-music"],
  { revalidate: 300, tags: ["music"] }
)

export async function GET() {
  const music = await getCachedMusic()
  return NextResponse.json(music)
}
