import { ForumClient, type Post as ForumPost } from "@/components/forum-client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const revalidate = 30
export const metadata = { title: "求档区 · 同人游戏站" }

export default async function ForumPage() {
  const session = await auth()

  let posts: ForumPost[] = []
  let totalPosts = 0
  try {
    const limit = 20
    const [fetchedPosts, count] = await Promise.all([
      prisma.forumPost.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.forumPost.count(),
    ])
    posts = fetchedPosts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      imageUrl: p.imageUrl ?? "",
      likeCount: p.likeCount,
      isSolved: p.isSolved,
      createdAt: p.createdAt.toISOString(),
      user: { id: p.user.id, username: p.user.username, avatar: p.user.avatar ?? "" },
      commentCount: p._count.comments,
    }))
    totalPosts = count
  } catch (error) {
    console.error("[ForumPage] Database query failed:", error)
  }

  const totalPages = Math.ceil(totalPosts / 20)

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

  return (
    <ForumClient
      initialPosts={posts}
      isLoggedIn={!!session?.user}
      currentUser={session?.user ? { id: session.user.id!, username: session.user.name ?? "", avatar: session.user.image ?? "" } : null}
      isAdmin={isAdmin}
      totalPages={totalPages}
    />
  )
}
