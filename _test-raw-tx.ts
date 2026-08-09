// 对照组：用原生 PrismaClient 直接测 $transaction 数组 deleteMany + delete
import { PrismaClient } from "@prisma/client"

async function main() {
  const raw = new PrismaClient()
  const user = await raw.user.findFirst({ select: { id: true } })
  if (!user) { await raw.$disconnect(); return }

  const post = await raw.forumPost.create({
    data: { userId: user.id, title: "RAW对照测试", content: "test", category: "discussion" },
  })
  console.log("原生帖子已创建:", post.id)
  await raw.forumComment.create({ data: { postId: post.id, userId: user.id, content: "评论" } })

  try {
    const r = await raw.$transaction([
      raw.forumComment.deleteMany({ where: { postId: post.id } }),
      raw.forumPostLike.deleteMany({ where: { postId: post.id } }),
      raw.forumPost.delete({ where: { id: post.id } }),
    ])
    console.log("原生事务删除成功:", r)
  } catch (e) {
    console.log("原生事务删除失败:", (e as Error).message.slice(0, 300))
    await raw.forumComment.deleteMany({ where: { postId: post.id } })
    await raw.forumPost.deleteMany({ where: { id: post.id } })
  }
  await raw.$disconnect()
}
main()
