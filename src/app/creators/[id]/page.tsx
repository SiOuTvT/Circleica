import { vndbClient } from "@/lib/vndb"
import { notFound } from "next/navigation"
import { CreatorDetailClient } from "./creator-detail-client"

/** 将 producer 数据转换为 creator 格式 */
function mapProducerToCreator(producer: any, vndbId: string) {
  return {
    id: producer.id,
    name: producer.name,
    original: producer.original,
    description: producer.description,
    gender: undefined,
    vndbId,
    roles: [],
    vns: (producer.developed || []).map((vn: any) => ({
      id: vn.id,
      title: vn.title,
      original: "",
      role: "开发者",
      rating: vn.rating,
      image: vn.image?.url,
    })),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // 尝试获取创作者名称用于标题
    let creator: any = null
    if (id.startsWith("s")) {
      creator = await vndbClient.getStaffDetail(id.slice(1))
    } else if (id.startsWith("p")) {
      const producer = await vndbClient.getProducer(id.slice(1))
      if (producer) creator = { name: producer.name }
    } else {
      creator = await vndbClient.getStaffDetail(id)
      if (!creator) {
        const producer = await vndbClient.getProducer(id)
        if (producer) creator = { name: producer.name }
      }
    }
    if (creator?.name) return { title: `${creator.name} · 创作者 · 同人游戏站` }
  } catch {}
  return { title: `创作者详情 · 同人游戏站` }
}

export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let creator: any = null

  try {
    // id 格式如 s123（staff）或 p123（producer）
    if (id.startsWith("s")) {
      creator = await vndbClient.getStaffDetail(id.slice(1))
    } else if (id.startsWith("p")) {
      const producer = await vndbClient.getProducer(id.slice(1))
      if (producer) creator = mapProducerToCreator(producer, id.slice(1))
    } else {
      // 纯数字 ID，尝试 staff 先，失败再 producer
      creator = await vndbClient.getStaffDetail(id)
      if (!creator) {
        const producer = await vndbClient.getProducer(id)
        if (producer) creator = mapProducerToCreator(producer, id)
      }
    }
  } catch (error) {
    console.error(`[CreatorPage] VNDB API error for ${id}:`, error)
  }

  if (!creator) notFound()

  return <CreatorDetailClient creator={creator} />
}
