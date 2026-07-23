import { CharacterDetailClient } from "@/components/character-detail-client"
import { logger } from "@/lib/logger"
import { vndbClient } from "@/lib/vndb"
import { notFound } from "next/navigation"

// 缓存角色页面 1 小时（VNDB 数据变化不频繁）
export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const character = await vndbClient.getCharacterDetail(id)
    if (character?.name) {
      const description = character.description?.replace(/<[^>]+>/g, "").slice(0, 160) || `${character.name} - VNDB 角色详情`
      return {
        title: `${character.name} · 角色详情 · Circleica`,
        description,
        openGraph: { title: `${character.name} · 角色详情`, description, images: ["/opengraph-image"] },
        alternates: { canonical: `/characters/${id}` },
      }
    }
  } catch (err) { logger.db.warn("[CharacterPage] generateMetadata VNDB failed", { error: err instanceof Error ? err.message : String(err) }) }
  return {
    title: `角色详情 · Circleica`,
    description: "查看 VNDB 角色详细信息",
    openGraph: { title: "角色详情 · Circleica", description: "查看 VNDB 角色详细信息", images: ["/opengraph-image"] },
    alternates: { canonical: `/characters/${id}` },
  }
}

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let character: Awaited<ReturnType<typeof vndbClient.getCharacterDetail>> = null
  try {
    character = await vndbClient.getCharacterDetail(id)
  } catch (error) {
    logger.db.error(`[CharacterPage] VNDB API error for ${id}`, error)
  }

  if (!character) notFound()

  return <CharacterDetailClient character={character} vndbId={id} />
}