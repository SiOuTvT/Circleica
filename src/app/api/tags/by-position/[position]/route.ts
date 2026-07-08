import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { isValidPosition } from "@/lib/tag-positions"
import { ValidationError } from "@/lib/errors"

export const GET = withHandler(async (_req, ctx) => {
  const { position } = await ctx!.params

  if (!isValidPosition(position)) {
    throw new ValidationError("无效的方位参数")
  }

  // 查找所有绑定了该方位的标签组，排除该方位下没有标签的空组
  const groups = await prisma.tagGroup.findMany({
    where: {
      positions: { contains: `"${position}"` },
      tags: { some: { isVisible: true } },
    },
    orderBy: { name: "asc" },
    include: {
      tags: {
        where: { isVisible: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  })

  return json(
    groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color,
      positions: JSON.parse(g.positions) as string[],
      tags: g.tags.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
      })),
    })),
  )
})
