import { withHandler, json } from "@/lib/api-handler"
import { vndbClient } from "@/lib/vndb"
import { NotFoundError } from "@/lib/errors"
import { logger } from "@/lib/logger"

export const GET = withHandler(async () => {
  // 优先尝试 staff（个人创作者：脚本家、画师、音乐人）
  try {
    const staff = await vndbClient.getRandomStaffMember()
    if (staff) {
      logger.api.debug(`从 VNDB 获取到 staff 创作者: ${staff.name} (ID: ${staff.id})`)
      return json({
        id: staff.id,
        name: staff.name,
        original: staff.original || "",
        description: staff.description || "",
        gender: staff.gender || "",
        vndbId: staff.vndbId || "",
        roles: staff.roles || [],
        vns: staff.vns || [],
        source: "vndb-staff",
      })
    }
  } catch (staffError) {
    logger.api.warn("Staff 搜索失败，尝试 fallback", {
      error: staffError instanceof Error ? staffError.message : String(staffError),
    })
  }

  // Fallback: 尝试 producer（团体/公司创作者）
  try {
    const producer = await vndbClient.getRandomDoujinCreator()
    if (producer) {
      logger.api.debug(`从 VNDB 获取到 producer 创作者: ${producer.name} (ID: ${producer.id})`)
      return json({
        id: producer.id,
        name: producer.name,
        original: producer.original || "",
        description: producer.description || "",
        gender: "",
        vndbId: producer.vndbId || "",
        type: producer.type || "",
        roles: [],
        vns: [],
        source: "vndb-producer",
      })
    }
  } catch (producerError) {
    logger.api.warn("Producer 搜索也失败", {
      error: producerError instanceof Error ? producerError.message : String(producerError),
    })
  }

  throw new NotFoundError("暂无创作者数据，请稍后重试")
})
