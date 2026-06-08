import { CharacterDetailClient } from "@/components/character-detail-client"
import { logger } from "@/lib/logger"
import { vndbClient } from "@/lib/vndb"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const character = await vndbClient.getCharacterDetail(id)
    if (character?.name) {
      return { title: `${character.name} · 角色详情 · 同人游戏站` }
    }
  } catch {}
  return { title: `角色详情 · 同人游戏站` }
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