// 最小复现：验证 $transaction 数组 deleteMany + delete 的时序
import { prisma } from "@/lib/prisma"
import { PrismaClient } from "@prisma/client"

async function main() {
  const raw = new PrismaClient()
  const user = await raw.user.findFirst({ select: { id: true } })
  if (!user) { await raw.$disconnect(); return }

  // 创建一个带评论的帖子
  const post = await prisma.forumPost.create({
    data: { userId: user.id, title: "TX时序测试", content: "test", category: "discussion" },
  })
  console.log("帖子已创建:", post.id)
  await prisma.forumComment.create({ data: { postId: post.id, userId: user.id, content: "评论" } })

  // 复刻 deletePost 逻辑
  try {
    const r = await prisma.$transaction([
      prisma.forumComment.deleteMany({ where: { postId: post.id } }),
      prisma.forumPostLike.deleteMany({ where: { postId: post.id } }),
      prisma.forumPost.delete({ where: { id: post.id } }),
    ])
    console.log("事务删除成功:", r)
  } catch (e) {
    console.log("事务删除失败:", (e as Error).message.slice(0, 300))
    // 清理残留
    await raw.forumComment.deleteMany({ where: { postId: post.id } })
    await raw.forumPost.deleteMany({ where: { id: post.id } })
  }

  // 直接单条删除（不走事务）
  const post2 = await prisma.forumPost.create({
    data: { userId: user.id, title: "TX时序测试2", content: "test", category: "discussion" },
  })
  try {
    const del = await prisma.forumPost.delete({ where: { id: post2.id } })
    console.log("单条删除成功:", del?.id)
  } catch (e) {
    console.log("单条删除失败:", (e as Error).message.slice(0, 300))
  }
  await raw.$disconnect()
}
main()
