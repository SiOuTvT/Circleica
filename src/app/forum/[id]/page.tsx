import { ForumPostDetail } from "@/components/forum-post-detail"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ChevronRight, Home } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

export const revalidate = 30

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const post = await prisma.forumPost.findUnique({ where: { id }, select: { title: true } })
  if (!post) return { title: "帖子不存在" }
  return { title: `${post.title} · 求档区` }
}

export default async function ForumPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      _count: { select: { comments: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
    },
  })

  if (!post) notFound()

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

  // flatten comments for client
  const flatComments = post.comments.map((c) => ({
    id: c.id,
    content: c.content,
    imageUrl: c.imageUrl ?? "",
    likeCount: c.likeCount,
    createdAt: c.createdAt.toISOString(),
    user: { id: c.user.id, username: c.user.username, avatar: c.user.avatar ?? "" },
  }))

  const postData = {
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl ?? "",
    likeCount: post.likeCount,
    commentCount: post._count?.comments ?? post.comments.length,
    isSolved: post.isSolved,
    createdAt: post.createdAt.toISOString(),
    user: { id: post.user.id, username: post.user.username, avatar: post.user.avatar ?? "" },
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* 面包屑 */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>首页</span>
        </Link>
        <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
        <Link href="/forum" className="hover:text-foreground transition-colors">求档区</Link>
        <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
        <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
      </nav>

      <ForumPostDetail
        post={postData}
        comments={flatComments}
        isLoggedIn={!!session?.user}
        currentUserId={session?.user?.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
