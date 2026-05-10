import { vndbClient } from "@/lib/vndb"
import { notFound } from "next/navigation"
import { CreatorDetailClient } from "./creator-detail-client"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `创作者详情 · 同人游戏站` }
}

export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // id 格式如 s123，getStaffDetail 需要不带 s 前缀的纯数字
  const vndbId = id.startsWith("s") ? id.slice(1) : id
  const creator = await vndbClient.getStaffDetail(vndbId)

  if (!creator) notFound()

  return <CreatorDetailClient creator={creator} />
}