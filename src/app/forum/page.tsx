import { ForumClient } from "@/components/forum-client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const revalidate = 30
export const metadata = { title: "求档区 · 同人游戏站" }

export default async function ForumPage() {
  const session = await auth()

  let posts: any[] = []
  try {
    posts = await prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    })
  } catch (error) {
    console.error("[ForumPage] Database query failed:", error)
  }

  const initialPosts = posts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    imageUrl: p.imageUrl,
    likeCount: p.likeCount,
    isSolved: p.isSolved,
    createdAt: p.createdAt.toISOString(),
    user: p.user,
    commentCount: p._count.comments,
  }))

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

  return (
    <ForumClient
      initialPosts={initialPosts}
      isLoggedIn={!!session?.user}
      currentUser={session?.user ? { id: session.user.id!, username: session.user.name ?? "", avatar: session.user.image ?? "" } : null}
      isAdmin={isAdmin}
    />
  )
}
