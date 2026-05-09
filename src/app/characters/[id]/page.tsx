import { CharacterDetailClient } from "@/components/character-detail-client"
import { vndbClient } from "@/lib/vndb"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `角色详情 · 同人游戏站` }
}

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 从 VNDB 获取角色详情
  const character = await vndbClient.getCharacterDetail(id)
  if (!character) notFound()

  return <CharacterDetailClient character={character} vndbId={id} />
}