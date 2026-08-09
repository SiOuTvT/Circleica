// 直接测 forumRepo.createPost 与 deletePost（$transaction 数组）
import { forumRepo } from "@/repositories/forum"
import { PrismaClient } from "@prisma/client"

async function main() {
  const raw = new PrismaClient()
  // 拿一个真实用户
  const user = await raw.user.findFirst({ select: { id: true, username: true } })
  console.log("测试用户:", user?.username)
  if (!user) { await raw.$disconnect(); return }

  // 1. createPost
  try {
    const post = await forumRepo.createPost(user.id, { title: "事务验证测试帖B", content: "测试内容", category: "discussion" })
    console.log("createPost OK:", post.id, post.title)
    // 2. 验证落库
    const check = await raw.forumPost.findUnique({ where: { id: post.id }, select: { id: true, title: true } })
    console.log("落库检查:", check ? "已落库 " + check.title : "未落库!!")
    // 3. deletePost（$transaction 数组）
    if (check) {
      const del = await forumRepo.deletePost(post.id)
      console.log("deletePost OK:", del ? "已删除" : "返回值空")
      const check2 = await raw.forumPost.findUnique({ where: { id: post.id }, select: { id: true } })
      console.log("删除后检查:", check2 ? "仍在!!" : "已清除")
    }
  } catch (e) {
    console.log("FAIL:", (e as Error).message.slice(0, 300))
  }
  await raw.$disconnect()
}
main()
