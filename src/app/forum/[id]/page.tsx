import { ForumPostDetail } from "@/components/forum-post-detail"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const revalidate = 30

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const post = await prisma.forumPost.findUnique({ where: { id }, select: { title: true, content: true } })
  if (!post) return { title: "帖子不存在" }
  const desc = post.content.replace(/<[^>]*>/g, "").slice(0, 160)
  return {
    title: `${post.title} · 求档区`,
    description: desc || `${post.title} - 同人游戏站求档区讨论帖`,
    openGraph: { title: post.title, description: desc, images: ["/opengraph-image"] },
    alternates: { canonical: `/forum/${id}` },
  }
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
        take: 100, // cap initial load; total count passed separately so UI can show "X of Y"
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
    viewCount: post.viewCount,
    isSolved: post.isSolved,
    isLocked: post.isLocked,
    createdAt: post.createdAt.toISOString(),
    user: { id: post.user.id, username: post.user.username, avatar: post.user.avatar ?? "" },
  }

  return (
    <div>
      <Link href="/forum" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        返回求档区
      </Link>
      <ForumPostDetail
        post={postData}
        comments={flatComments}
        totalCommentCount={post._count?.comments ?? flatComments.length}
        isLoggedIn={!!session?.user}
        currentUserId={session?.user?.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
