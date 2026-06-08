import { logger } from "@/lib/logger"
import { vndbClient } from "@/lib/vndb"
import { notFound } from "next/navigation"
import { CreatorDetailClient } from "./creator-detail-client"

interface ProducerData {
  id: string
  name: string
  original?: string
  description?: string
  developed?: Array<{
    id: string
    title: string
    rating?: number
    image?: { url: string }
  }>
}

interface CreatorData {
  id: string
  name: string
  original?: string
  description?: string
  gender?: string
  vndbId: string
  roles: string[]
  vns: Array<{
    id: string
    title: string
    original?: string
    role: string
    rating?: number
    image?: string
  }>
}

/** 将 producer 数据转换为 creator 格式 */
function mapProducerToCreator(producer: ProducerData, vndbId: string): CreatorData {
  return {
    id: producer.id,
    name: producer.name,
    original: producer.original || "",
    description: producer.description || "",
    gender: undefined,
    vndbId,
    roles: [],
    vns: (producer.developed || []).map((vn) => ({
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
    let creatorName: string | null = null
    if (id.startsWith("s")) {
      const staff = await vndbClient.getStaffDetail(id.slice(1))
      creatorName = staff?.name || null
    } else if (id.startsWith("p")) {
      const producer = await vndbClient.getProducer(id.slice(1))
      creatorName = producer?.name || null
    } else {
      const staff = await vndbClient.getStaffDetail(id)
      creatorName = staff?.name || null
      if (!creatorName) {
        const producer = await vndbClient.getProducer(id)
        creatorName = producer?.name || null
      }
    }
    if (creatorName) return { title: `${creatorName} · 创作者 · 同人游戏站` }
  } catch {}
  return { title: `创作者详情 · 同人游戏站` }
}

export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let creator: CreatorData | null = null

  try {
    // id 格式如 s123（staff）或 p123（producer）
    if (id.startsWith("s")) {
      const staff = await vndbClient.getStaffDetail(id.slice(1))
      if (staff) creator = { ...staff, vndbId: id.slice(1), roles: staff.roles || [], vns: staff.vns || [] }
    } else if (id.startsWith("p")) {
      const producer = await vndbClient.getProducer(id.slice(1))
      if (producer) creator = mapProducerToCreator(producer, id.slice(1))
    } else {
      // 纯数字 ID，尝试 staff 先，失败再 producer
      const staff = await vndbClient.getStaffDetail(id)
      if (staff) creator = { ...staff, vndbId: id, roles: staff.roles || [], vns: staff.vns || [] }
      if (!creator) {
        const producer = await vndbClient.getProducer(id)
        if (producer) creator = mapProducerToCreator(producer, id)
      }
    }
  } catch (error) {
    logger.db.error(`[CreatorPage] VNDB API error for ${id}`, error)
  }

  if (!creator) notFound()

  return <CreatorDetailClient creator={creator} />
}
