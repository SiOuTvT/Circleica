import { prisma } from "@/lib/prisma"

export type TargetType = "GAME" | "WORK"

/**
 * 记录一次浏览（继续浏览）。同一用户同一目标只留一条，重复浏览刷新 createdAt 排到最前。
 * 用原生 SQL（不经 Prisma 生成的模型），避免改动 schema 生成带来的锁文件/备份表问题。
 */
export async function recordView(userId: string, targetType: TargetType, targetId: string) {
  await prisma.$executeRaw`
    INSERT INTO "ViewHistory" ("id", "userId", "targetType", "targetId", "createdAt")
    VALUES (gen_random_uuid(), ${userId}, ${targetType}, ${targetId}, now())
    ON CONFLICT ("userId", "targetType", "targetId") DO UPDATE SET "createdAt" = now()
  `
}

/** 取某用户最近浏览的目标 id 列表（最近在前） */
export async function getRecentViewIds(
  userId: string,
  targetType: TargetType,
  limit = 12,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ targetId: string }[]>`
    SELECT "targetId" FROM "ViewHistory"
    WHERE "userId" = ${userId} AND "targetType" = ${targetType}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `
  return rows.map((r) => r.targetId)
}
