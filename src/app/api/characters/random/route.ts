import { withHandler, json } from "@/lib/api-handler"
import { vndbClient } from "@/lib/vndb"
import { NotFoundError } from "@/lib/errors"

export const GET = withHandler(async () => {
  const character = await vndbClient.getRandomCharacter()

  if (!character) {
    throw new NotFoundError("暂无角色数据，请稍后重试")
  }

  return json({
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
})
