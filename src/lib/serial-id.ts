import { prisma } from "./prisma"

/**
 * 将 serialId 格式的 UID 转为零填充字符串
 * serialId=1 => "00001", serialId=99999 => "99999", serialId=100000 => "100000"
 */
export function serialIdToUid(serialId: number): string {
  if (serialId < 100000) {
    return String(serialId).padStart(5, "0")
  }
  return String(serialId)
}

/**
 * 判断一个字符串是否为数字型 serialId（用于路由参数）
 * cuid 格式如 "clxyz123..." 包含字母，纯数字则是 serialId
 */
export function isNumericId(id: string): boolean {
  return /^\d+$/.test(id)
}

/**
 * 根据 serialId（数字字符串）查找用户，返回用户对象（含 serialId/uid）或 null
 */
export async function findUserBySerialId(serialId: number) {
  return prisma.user.findUnique({
    where: { serialId },
    select: {
      id: true,
      serialId: true,
      uid: true,
      username: true,
      email: true,
      avatar: true,
      avatarFrame: true,
      banner: true,
      bio: true,
      role: true,
      faveGameId: true,
      createdAt: true,
    },
  })
}

/**
 * 根据 cuid 查找用户（用于旧链接重定向）
 */
export async function findUserByCuid(cuid: string) {
  return prisma.user.findUnique({
    where: { id: cuid },
    select: { serialId: true },
  })
}

/**
 * 根据 serialId 查找游戏
 */
export async function findGameBySerialId(serialId: number) {
  return prisma.game.findUnique({
    where: { serialId },
    select: {
      id: true,
      serialId: true,
      title: true,
      coverImage: true,
      description: true,
      isPublished: true,
    },
  })
}

/**
 * 根据 cuid 查找游戏（用于旧链接重定向）
 */
export async function findGameByCuid(cuid: string) {
  return prisma.game.findUnique({
    where: { id: cuid },
    select: { serialId: true },
  })
}