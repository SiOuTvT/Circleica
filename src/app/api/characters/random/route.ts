import { logger } from "@/lib/logger"
import { vndbClient } from "@/lib/vndb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    logger.api.debug("开始获取随机游戏角色（VNDB）")

    const character = await vndbClient.getRandomCharacter()

    if (character) {
      logger.api.debug(`从 VNDB 获取到角色: ${character.name} (ID: ${character.id})`)

      return NextResponse.json({
        id: character.id,
        name: character.name,
        original: character.original || "",
        image: character.image || "",
        role: character.role || "",
        gender: character.gender || [],
        age: character.age || null,
        birthday: character.birthday || null,
        bloodType: character.bloodType || "",
        height: character.height || "",
        weight: character.weight || "",
        bust: character.bust || "",
        waist: character.waist || "",
        hips: character.hips || "",
        cup: character.cup || "",
        description: character.description || "",
        aliases: character.aliases || [],
        traits: character.traits || [],
        vnTitle: character.vnTitle || "",
        source: "vndb",
      })
    }

    logger.api.error("VNDB 未返回角色数据")
    return NextResponse.json(
      { error: "暂无角色数据，请稍后重试" },
      { status: 404 }
    )
  } catch (error) {
    logger.api.error("Failed to get random character", error)
    return NextResponse.json(
      { error: "获取失败，请稍后重试" },
      { status: 500 }
    )
  }
}