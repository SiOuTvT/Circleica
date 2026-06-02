import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"

const getCachedTags = unstable_cache(
  () => prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, groupId: true, sortOrder: true, isVisible: true },
  }),
  ["all-tags"],
  { revalidate: 300, tags: ["tags"] }
)

export async function GET() {
  const tags = await getCachedTags()
  return NextResponse.json(tags)
}
